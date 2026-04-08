import { tool } from "ai";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import type { Database, ApartmentWithDetails } from "@/app/lib/types";
import { calculateAffordability, formatNaira } from "@/app/lib/ai/affordability";
import { NEIGHBORHOODS } from "@/app/lib/data/neighborhoods";
import { searchApartmentsBySemantic, searchKnowledge } from "@/app/lib/ai/rag";

type TavilySearchResponse = {
    query: string;
    response_time?: number;
    answer?: string;
    results?: Array<{
        title?: string;
        url?: string;
        content?: string;
        score?: number;
        published_date?: string;
    }>;
};

type BraveSearchResponse = {
    web?: {
        results?: Array<{
            title?: string;
            url?: string;
            description?: string;
            page_age?: string;
        }>;
    };
};

const DEFAULT_TRUSTED_WEB_SOURCES = [
    "nigerianstat.gov.ng",
    "cbn.gov.ng",
    "lagosstate.gov.ng",
    "fcta.gov.ng",
    "riversstate.gov.ng",
    "nairametrics.com",
    "businessday.ng",
    "guardian.ng",
];

async function tavilyWebSearch(params: {
    query: string;
    maxResults: number;
    searchDepth: "basic" | "advanced";
    includeDomains?: string[];
    excludeDomains?: string[];
}): Promise<{
    ok: boolean;
    error?: string;
    data?: {
        query: string;
        response_time_ms?: number;
        answer?: string;
        results: Array<{
            title: string;
            url: string;
            snippet: string;
            score: number | null;
            published_date: string | null;
        }>;
    };
}> {
    const apiKey = process.env.TAVILY_API_KEY;
    if (!apiKey) {
        return {
            ok: false,
            error: "TAVILY_API_KEY is not configured on the server.",
        };
    }

    const response = await fetch("https://api.tavily.com/search", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
            query: params.query,
            search_depth: params.searchDepth,
            include_answer: true,
            max_results: params.maxResults,
            include_domains:
                params.includeDomains && params.includeDomains.length > 0
                    ? params.includeDomains
                    : undefined,
            exclude_domains:
                params.excludeDomains && params.excludeDomains.length > 0
                    ? params.excludeDomains
                    : undefined,
        }),
    });

    if (!response.ok) {
        const details = await response.text();
        return {
            ok: false,
            error: `Tavily search failed (${response.status}): ${details.slice(0, 300)}`,
        };
    }

    const payload = (await response.json()) as TavilySearchResponse;
    const normalizedResults = (payload.results ?? [])
        .filter((r) => typeof r.url === "string" && typeof r.title === "string")
        .map((r) => ({
            title: r.title ?? "Untitled",
            url: r.url ?? "",
            snippet: (r.content ?? "").slice(0, 700),
            score: typeof r.score === "number" ? r.score : null,
            published_date: r.published_date ?? null,
        }));

    return {
        ok: true,
        data: {
            query: payload.query,
            response_time_ms: payload.response_time,
            answer: payload.answer,
            results: normalizedResults,
        },
    };
}

async function braveWebSearch(params: {
    query: string;
    maxResults: number;
    includeDomains?: string[];
    excludeDomains?: string[];
}): Promise<{
    ok: boolean;
    error?: string;
    data?: {
        query: string;
        answer?: string;
        results: Array<{
            title: string;
            url: string;
            snippet: string;
            score: number | null;
            published_date: string | null;
        }>;
    };
}> {
    const apiKey = process.env.BRAVE_SEARCH_API_KEY;
    if (!apiKey) {
        return {
            ok: false,
            error: "BRAVE_SEARCH_API_KEY is not configured on the server.",
        };
    }

    const includeDomainQuery = (params.includeDomains ?? []).map((d) => `site:${d}`).join(" OR ");
    const excludeDomainQuery = (params.excludeDomains ?? []).map((d) => `-site:${d}`).join(" ");
    const effectiveQuery = [params.query, includeDomainQuery, excludeDomainQuery]
        .filter((part) => part && part.trim().length > 0)
        .join(" ");

    const searchParams = new URLSearchParams({
        q: effectiveQuery,
        count: String(params.maxResults),
        result_filter: "web",
        country: "NG",
        search_lang: "en",
        safesearch: "moderate",
    });

    const response = await fetch(`https://api.search.brave.com/res/v1/web/search?${searchParams.toString()}`, {
        method: "GET",
        headers: {
            Accept: "application/json",
            "X-Subscription-Token": apiKey,
        },
    });

    if (!response.ok) {
        const details = await response.text();
        return {
            ok: false,
            error: `Brave search failed (${response.status}): ${details.slice(0, 300)}`,
        };
    }

    const payload = (await response.json()) as BraveSearchResponse;
    const normalizedResults = (payload.web?.results ?? [])
        .filter((r) => typeof r.url === "string" && typeof r.title === "string")
        .map((r) => ({
            title: r.title ?? "Untitled",
            url: r.url ?? "",
            snippet: (r.description ?? "").slice(0, 700),
            score: null,
            published_date: r.page_age ?? null,
        }));

    return {
        ok: true,
        data: {
            query: params.query,
            results: normalizedResults,
        },
    };
}

// Service-role client for AI agent operations (bypasses RLS)
function getServiceClient(): ReturnType<typeof createClient<Database>> {
    return createClient<Database>(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );
}

export const searchApartments = tool({
    description:
        "Search for available apartments based on tenant criteria. Returns matching listings sorted by relevance.",
    inputSchema: z.object({
        city: z.enum(["lagos", "abuja", "port-harcourt"]).optional().describe("City to search in"),
        min_rent: z.number().optional().describe("Minimum annual rent in Naira"),
        max_rent: z.number().optional().describe("Maximum annual rent in Naira"),
        apartment_type: z
            .enum(["self-contained", "mini-flat", "1-bedroom", "2-bedroom", "3-bedroom", "duplex"])
            .optional()
            .describe("Type of apartment"),
        neighborhood: z.string().optional().describe("Specific neighborhood name"),
        required_amenities: z
            .array(z.string())
            .optional()
            .describe("Amenities the apartment must have"),
    }),
    execute: async ({ city, min_rent, max_rent, apartment_type, neighborhood, required_amenities }) => {
        const supabase = getServiceClient();

        let query = supabase
            .from("apartments")
            .select(`
        *,
        apartment_amenities(amenity),
        apartment_images(image_url, is_primary, display_order),
        environmental_factors(*),
        profiles!apartments_landlord_id_fkey(full_name, phone)
      `)
            .eq("is_available", true)
            .order("created_at", { ascending: false })
            .limit(10);

        if (city) query = query.eq("city", city);
        if (min_rent) query = query.gte("annual_rent", min_rent);
        if (max_rent) query = query.lte("annual_rent", max_rent);
        if (apartment_type) query = query.eq("apartment_type", apartment_type);
        if (neighborhood) query = query.ilike("neighborhood", `%${neighborhood}%`);

        const { data, error } = await query;

        if (error) {
            return { error: "Failed to search apartments. Please try again." };
        }

        if (!data || data.length === 0) {
            return {
                results: [],
                message: "No apartments found matching your criteria. Try adjusting your filters.",
            };
        }

        // Post-filter by required amenities if specified
        let filtered = data;
        if (required_amenities && required_amenities.length > 0) {
            filtered = data.filter((apt) => {
                const aptAmenities = (apt.apartment_amenities as Array<{ amenity: string }>).map(
                    (a) => a.amenity,
                );
                return required_amenities.every((ra) => aptAmenities.includes(ra));
            });
        }

        const results = filtered.map((apt) => ({
            id: apt.id,
            ppid: apt.ppid,
            title: apt.title,
            apartment_type: apt.apartment_type,
            annual_rent: formatNaira(apt.annual_rent),
            total_upfront_cost: formatNaira(apt.total_upfront_cost),
            city: apt.city,
            neighborhood: apt.neighborhood,
            lga: apt.lga,
            amenities: (apt.apartment_amenities as Array<{ amenity: string }>).map((a) => a.amenity),
            primary_image: (apt.apartment_images as Array<{ image_url: string; is_primary: boolean }>)
                .find((img) => img.is_primary)?.image_url ?? null,
            environmental_factors: apt.environmental_factors,
            description: apt.description.slice(0, 200),
        }));

        return {
            results,
            count: results.length,
            message: `Found ${results.length} apartment${results.length === 1 ? "" : "s"} matching your criteria.`,
        };
    },
});

export const getApartmentDetails = tool({
    description: "Get full details for a specific apartment listing including all images and environmental data.",
    inputSchema: z.object({
        apartment_id: z.string().uuid().describe("The apartment ID to look up"),
    }),
    execute: async ({ apartment_id }) => {
        const supabase = getServiceClient();

        const { data, error } = await supabase
            .from("apartments")
            .select(`
        *,
        apartment_amenities(amenity),
        apartment_images(image_url, is_primary, display_order),
        environmental_factors(*),
        profiles!apartments_landlord_id_fkey(full_name, phone)
      `)
            .eq("id", apartment_id)
            .single();

        if (error || !data) {
            return { error: "Apartment not found." };
        }

        return {
            ...data,
            annual_rent_formatted: formatNaira(data.annual_rent),
            total_upfront_cost_formatted: formatNaira(data.total_upfront_cost),
            amenities: (data.apartment_amenities as Array<{ amenity: string }>).map((a) => a.amenity),
            images: (data.apartment_images as Array<{ image_url: string; is_primary: boolean; display_order: number }>),
            environmental_factors: data.environmental_factors,
            landlord: data.profiles,
        };
    },
});

export const checkAffordability = tool({
    description:
        "Calculate whether an apartment is affordable for a tenant based on their annual income. Uses Nigerian affordability standards (rent ≤30% of income). Also breaks down total upfront cost.",
    inputSchema: z.object({
        annual_income: z.number().describe("Tenant's gross annual income in Naira"),
        annual_rent: z.number().describe("The apartment's annual rent in Naira"),
        deposit: z.number().default(0).describe("Caution/security deposit in Naira"),
        agent_fee: z.number().default(0).describe("Agent/caretaker fee in Naira"),
    }),
    execute: async ({ annual_income, annual_rent, deposit, agent_fee }) => {
        const result = calculateAffordability(annual_income, annual_rent, deposit, agent_fee);
        return {
            ...result,
            annual_income_formatted: formatNaira(result.annual_income),
            annual_rent_formatted: formatNaira(result.annual_rent),
            total_upfront_cost_formatted: formatNaira(result.total_upfront_cost),
            rent_to_income_percentage: `${Math.round(result.rent_to_income_ratio * 100)}%`,
        };
    },
});

export const getNeighborhoodInfo = tool({
    description:
        "Get detailed information about a neighborhood including typical rent ranges, environmental factors, pros/cons, and nearby hubs.",
    inputSchema: z.object({
        neighborhood_name: z.string().describe("Name of the neighborhood to look up"),
        city: z.enum(["lagos", "abuja", "port-harcourt"]).optional().describe("City to narrow search"),
    }),
    execute: async ({ neighborhood_name, city }) => {
        const matches = NEIGHBORHOODS.filter((n) => {
            const nameMatch = n.name.toLowerCase().includes(neighborhood_name.toLowerCase());
            const cityMatch = city ? n.city === city : true;
            return nameMatch && cityMatch;
        });

        if (matches.length === 0) {
            return {
                found: false,
                message: `No information available for "${neighborhood_name}". I can provide info on: ${NEIGHBORHOODS.map((n) => n.name).join(", ")}.`,
            };
        }

        return {
            found: true,
            neighborhoods: matches.map((n) => ({
                ...n,
                typical_rent_formatted: Object.fromEntries(
                    Object.entries(n.typical_rent).map(([type, range]) => [
                        type,
                        range ? `${formatNaira(range.min)} - ${formatNaira(range.max)}` : "N/A",
                    ]),
                ),
            })),
        };
    },
});

export const getRentalPriceIndex = tool({
    description:
        "Get the Rental Price Index (RPI) for a specific LGA and city, computed from historical transactions, inflation rates, and comparable active listings.",
    inputSchema: z.object({
        city: z.enum(["lagos", "abuja", "port-harcourt"]).describe("City for the LGA"),
        lga: z.string().describe("Local Government Area name"),
        apartment_type: z
            .enum(["all", "self-contained", "mini-flat", "1-bedroom", "2-bedroom", "3-bedroom", "duplex"])
            .default("all")
            .describe("Apartment type bucket for the index"),
        year: z.number().optional().describe("Target year; defaults to latest available"),
        month: z.number().optional().describe("Target month (1-12); defaults to latest available"),
    }),
    execute: async ({ city, lga, apartment_type, year, month }) => {
        const supabase = getServiceClient();

        const { data, error } = await supabase.rpc("get_lga_rpi", {
            p_city: city,
            p_lga: lga,
            p_apartment_type: apartment_type,
            p_year: year ?? null,
            p_month: month ?? null,
        });

        if (error) {
            return {
                found: false,
                message: "Unable to fetch Rental Price Index right now.",
            };
        }

        const row = data?.[0];

        if (!row) {
            return {
                found: false,
                message: "No Rental Price Index data available for that LGA yet.",
            };
        }

        const totalSamples = row.sample_size_hist + row.sample_size_comp;
        const confidence =
            totalSamples >= 30
                ? "high"
                : totalSamples >= 12
                    ? "medium"
                    : "low";

        return {
            found: true,
            city: row.city,
            state_code: row.state_code,
            lga: row.lga,
            apartment_type: row.apartment_type,
            period: `${row.year}-${String(row.month).padStart(2, "0")}`,
            rpi_value: row.rpi_value,
            rpi_formatted: formatNaira(Math.round(row.rpi_value)),
            trend: row.trend,
            trend_percent: row.trend_percent,
            components: {
                historical_transactions: row.hist_component,
                comparable_listings: row.comp_component,
                inflation_rate: row.inflation_component,
            },
            sample_sizes: {
                historical: row.sample_size_hist,
                comparable: row.sample_size_comp,
                total: totalSamples,
            },
            confidence,
        };
    },
});

export const saveApartment = tool({
    description: "Save an apartment to the tenant's favorites list.",
    inputSchema: z.object({
        apartment_id: z.string().uuid().describe("The apartment ID to save"),
        tenant_id: z.string().uuid().describe("The tenant's user ID"),
    }),
    execute: async ({ apartment_id, tenant_id }) => {
        const supabase = getServiceClient();

        const { error } = await supabase
            .from("saved_apartments")
            .upsert({ apartment_id, tenant_id }, { onConflict: "tenant_id,apartment_id" });

        if (error) {
            return { success: false, message: "Failed to save apartment. Please try again." };
        }

        return { success: true, message: "Apartment saved to your favorites!" };
    },
});

export const createInquiry = tool({
    description:
        "Send an inquiry message to the landlord about a specific apartment. Always confirm with the tenant before calling this tool.",
    inputSchema: z.object({
        apartment_id: z.string().uuid().describe("The apartment ID to inquire about"),
        tenant_id: z.string().uuid().describe("The tenant's user ID"),
        message: z.string().describe("The inquiry message to send to the landlord"),
    }),
    execute: async ({ apartment_id, tenant_id, message }) => {
        const supabase = getServiceClient();

        const { error } = await supabase.from("inquiries").insert({
            apartment_id,
            tenant_id,
            message,
            status: "pending",
        });

        if (error) {
            return { success: false, message: "Failed to send inquiry. Please try again." };
        }

        return {
            success: true,
            message: "Your inquiry has been sent to the landlord. They will be notified and can respond to you.",
        };
    },
});

export const semanticSearchApartments = tool({
    description:
        "Search for apartments using natural language. This uses AI-powered semantic search to find apartments matching a descriptive query like 'quiet 2-bedroom near tech hubs in Lagos with good power supply'. Use this when the tenant describes what they want in natural language rather than specific filters.",
    inputSchema: z.object({
        query: z.string().describe("Natural language description of the ideal apartment"),
        city: z.enum(["lagos", "abuja", "port-harcourt"]).optional().describe("City to search in"),
        apartment_type: z
            .enum(["self-contained", "mini-flat", "1-bedroom", "2-bedroom", "3-bedroom", "duplex"])
            .optional()
            .describe("Type of apartment"),
        max_rent: z.number().optional().describe("Maximum annual rent in Naira"),
    }),
    execute: async ({ query, city, apartment_type, max_rent }) => {
        const results = await searchApartmentsBySemantic(query, {
            city,
            apartmentType: apartment_type,
            maxRent: max_rent,
            matchCount: 8,
            matchThreshold: 0.3,
        });

        if (results.length === 0) {
            return {
                results: [],
                message: "No apartments found matching your description. Try broadening your search or using different terms.",
            };
        }

        return {
            results: results.map((r) => ({
                apartment_id: r.apartment_id,
                similarity_score: Math.round(r.similarity * 100) / 100,
                summary: r.content.slice(0, 300),
                metadata: r.metadata,
            })),
            count: results.length,
            message: `Found ${results.length} apartment${results.length === 1 ? "" : "s"} matching your description.`,
        };
    },
});

export const semanticSearchKnowledge = tool({
    description:
        "Search the knowledge base for information about neighborhoods, market insights, and real estate FAQs. Use this when the tenant asks general questions about areas, living conditions, or the Nigerian rental market.",
    inputSchema: z.object({
        query: z.string().describe("Natural language question about neighborhoods or the rental market"),
        source_type: z
            .enum(["neighborhood", "market_insight", "faq"])
            .optional()
            .describe("Filter by knowledge type"),
    }),
    execute: async ({ query, source_type }) => {
        const results = await searchKnowledge(query, {
            sourceType: source_type,
            matchCount: 5,
            matchThreshold: 0.3,
        });

        if (results.length === 0) {
            return {
                results: [],
                message: "No relevant information found in the knowledge base.",
            };
        }

        return {
            results: results.map((r) => ({
                source_type: r.source_type,
                source_id: r.source_id,
                content: r.content,
                similarity_score: Math.round(r.similarity * 100) / 100,
            })),
            count: results.length,
            message: `Found ${results.length} relevant knowledge entries.`,
        };
    },
});

export const webSearch = tool({
    description:
        "Search the live web for up-to-date external information. Use this for current market news, policy/regulation updates, inflation/CPI releases, and facts that are not guaranteed to exist in the local database. Prefer trusted Nigerian sources and always cite returned URLs.",
    inputSchema: z.object({
        query: z.string().min(3).describe("What to search for on the web"),
        max_results: z
            .number()
            .int()
            .min(1)
            .max(8)
            .default(5)
            .describe("Number of search results to return (1-8)"),
        search_depth: z
            .enum(["basic", "advanced"])
            .default("advanced")
            .describe("Depth of web retrieval"),
        trusted_sources_only: z
            .boolean()
            .default(false)
            .describe("If true, only query trusted source domains"),
        include_domains: z
            .array(z.string())
            .optional()
            .describe("Optional list of domains to include"),
        exclude_domains: z
            .array(z.string())
            .optional()
            .describe("Optional list of domains to exclude"),
    }),
    execute: async ({
        query,
        max_results,
        search_depth,
        trusted_sources_only,
        include_domains,
        exclude_domains,
    }) => {
        const mergedIncludeDomains = trusted_sources_only
            ? [...new Set([...(include_domains ?? []), ...DEFAULT_TRUSTED_WEB_SOURCES])]
            : include_domains;

        try {
            const tavilySearch = await tavilyWebSearch({
                query,
                maxResults: max_results,
                searchDepth: search_depth,
                includeDomains: mergedIncludeDomains,
                excludeDomains: exclude_domains,
            });

            // Primary provider: Tavily. Fallback provider: Brave Search.
            const search = tavilySearch.ok && tavilySearch.data
                ? { provider: "tavily", ...tavilySearch }
                : await (async () => {
                    const braveSearch = await braveWebSearch({
                        query,
                        maxResults: max_results,
                        includeDomains: mergedIncludeDomains,
                        excludeDomains: exclude_domains,
                    });
                    return { provider: "brave", ...braveSearch };
                })();

            if (!search.ok || !search.data) {
                return {
                    success: false,
                    query,
                    message:
                        search.error ??
                        "Web search providers failed (Tavily + Brave). Please try again.",
                };
            }

            if (search.data.results.length === 0) {
                return {
                    success: true,
                    query,
                    provider: search.provider,
                    count: 0,
                    answer: search.data.answer ?? null,
                    results: [],
                    message: "No web results found for that query.",
                };
            }

            return {
                success: true,
                query,
                provider: search.provider,
                count: search.data.results.length,
                answer: search.data.answer ?? null,
                response_time_ms: "response_time_ms" in search.data ? search.data.response_time_ms ?? null : null,
                results: search.data.results,
                citation_hint:
                    "When using this data in a response, cite the source URLs directly and mention publication dates when available.",
            };
        } catch (error) {
            return {
                success: false,
                query,
                message:
                    error instanceof Error
                        ? `Web search failed: ${error.message}`
                        : "Web search failed unexpectedly.",
            };
        }
    },
});

export const compareRpiAcrossLgas = tool({
    description:
        "Compare the Rental Price Index across multiple LGAs in a city side-by-side. Use this when a tenant wants to compare rent markets across different areas, find the best value LGA, or understand price trends relative to each other.",
    inputSchema: z.object({
        city: z.enum(["lagos", "abuja", "port-harcourt"]).describe("City to compare LGAs within"),
        lgas: z
            .array(z.string())
            .min(2)
            .max(6)
            .describe("2–6 LGA names to compare"),
        apartment_type: z
            .enum(["all", "self-contained", "mini-flat", "1-bedroom", "2-bedroom", "3-bedroom", "duplex"])
            .default("all")
            .describe("Apartment type to compare; 'all' gives the blended market index"),
    }),
    execute: async ({ city, lgas, apartment_type }) => {
        const supabase = getServiceClient();

        const results = await Promise.all(
            lgas.map(async (lga) => {
                const { data } = await supabase.rpc("get_lga_rpi", {
                    p_city: city,
                    p_lga: lga,
                    p_apartment_type: apartment_type,
                    p_year: null,
                    p_month: null,
                });

                const row = data?.[0];
                if (!row) {
                    return { lga, found: false };
                }

                const totalSamples = row.sample_size_hist + row.sample_size_comp;
                const confidence =
                    totalSamples >= 30 ? "high" : totalSamples >= 12 ? "medium" : "low";

                return {
                    lga: row.lga,
                    found: true,
                    period: `${row.year}-${String(row.month).padStart(2, "0")}`,
                    rpi_value: row.rpi_value,
                    rpi_formatted: formatNaira(Math.round(row.rpi_value)),
                    trend: row.trend,
                    trend_percent: row.trend_percent,
                    confidence,
                    sample_sizes: {
                        historical: row.sample_size_hist,
                        comparable: row.sample_size_comp,
                        total: totalSamples,
                    },
                };
            }),
        );

        const found = results.filter((r) => r.found && "rpi_value" in r) as Array<{
            lga: string;
            found: true;
            period: string;
            rpi_value: number;
            rpi_formatted: string;
            trend: string;
            trend_percent: number;
            confidence: string;
            sample_sizes: { historical: number; comparable: number; total: number };
        }>;

        if (found.length === 0) {
            return {
                found: false,
                message: "No RPI data available for any of the requested LGAs.",
            };
        }

        // Sort cheapest to most expensive
        const ranked = [...found].sort((a, b) => a.rpi_value - b.rpi_value);
        const cheapest = ranked[0];
        const mostExpensive = ranked[ranked.length - 1];
        const spread = mostExpensive.rpi_value - cheapest.rpi_value;
        const spreadFormatted = formatNaira(Math.round(spread));

        return {
            city,
            apartment_type,
            results: ranked,
            summary: {
                lowest_rpi_lga: cheapest.lga,
                lowest_rpi_value: cheapest.rpi_formatted,
                highest_rpi_lga: mostExpensive.lga,
                highest_rpi_value: mostExpensive.rpi_formatted,
                price_spread: spreadFormatted,
                trending_up: found.filter((r) => r.trend === "up").map((r) => r.lga),
                trending_down: found.filter((r) => r.trend === "down").map((r) => r.lga),
                best_value_lga: cheapest.lga,
            },
        };
    },
});

export const assessRentVsMarket = tool({
    description:
        "Assess whether a specific apartment's rent is fair compared to its LGA's Rental Price Index. Use this after finding apartments to give tenants an honest market assessment — whether a listing is overpriced, fairly priced, or a bargain.",
    inputSchema: z.object({
        apartment_id: z.string().uuid().describe("Apartment ID to assess"),
    }),
    execute: async ({ apartment_id }) => {
        const supabase = getServiceClient();

        const { data: apt, error: aptError } = await supabase
            .from("apartments")
            .select("id, ppid, title, annual_rent, city, lga, apartment_type, neighborhood")
            .eq("id", apartment_id)
            .single();

        if (aptError || !apt) {
            return { found: false, message: "Apartment not found." };
        }

        const { data: rpiData } = await supabase.rpc("get_lga_rpi", {
            p_city: apt.city,
            p_lga: apt.lga,
            p_apartment_type: apt.apartment_type,
            p_year: null,
            p_month: null,
        });

        const rpiRow = rpiData?.[0];

        if (!rpiRow) {
            // Try 'all' types as fallback
            const { data: rpiAllData } = await supabase.rpc("get_lga_rpi", {
                p_city: apt.city,
                p_lga: apt.lga,
                p_apartment_type: "all",
                p_year: null,
                p_month: null,
            });

            const fallbackRow = rpiAllData?.[0];
            if (!fallbackRow) {
                return {
                    found: true,
                    apartment_title: apt.title,
                    annual_rent: apt.annual_rent,
                    annual_rent_formatted: formatNaira(apt.annual_rent),
                    rpi_available: false,
                    message: "No market index data available for this LGA yet.",
                };
            }

            const delta = apt.annual_rent - fallbackRow.rpi_value;
            const pct = (delta / fallbackRow.rpi_value) * 100;

            return buildAssessment(apt, fallbackRow, delta, pct, "all");
        }

        const delta = apt.annual_rent - rpiRow.rpi_value;
        const pct = (delta / rpiRow.rpi_value) * 100;

        return buildAssessment(apt, rpiRow, delta, pct, apt.apartment_type);
    },
});

function buildAssessment(
    apt: { id: string; ppid: string; title: string; annual_rent: number; city: string; lga: string; apartment_type: string; neighborhood: string },
    rpiRow: { rpi_value: number; trend: string; trend_percent: number; year: number; month: number; sample_size_hist: number; sample_size_comp: number },
    delta: number,
    pct: number,
    indexType: string,
): Record<string, unknown> {
    const totalSamples = rpiRow.sample_size_hist + rpiRow.sample_size_comp;
    const confidence = totalSamples >= 30 ? "high" : totalSamples >= 12 ? "medium" : "low";

    let verdict: string;
    let explanation: string;

    if (Math.abs(pct) <= 5) {
        verdict = "fairly_priced";
        explanation = `The asking rent of ${formatNaira(apt.annual_rent)} is within 5% of the ${apt.lga} LGA market index (${formatNaira(Math.round(rpiRow.rpi_value))}). This is a fair market price.`;
    } else if (pct < -5 && pct >= -20) {
        verdict = "good_value";
        explanation = `The asking rent is ${Math.abs(pct).toFixed(0)}% below the ${apt.lga} LGA market index — this represents good value.`;
    } else if (pct < -20) {
        verdict = "exceptional_value";
        explanation = `The asking rent is ${Math.abs(pct).toFixed(0)}% below the LGA market index — an exceptional deal. Verify conditions and lease terms carefully.`;
    } else if (pct > 5 && pct <= 20) {
        verdict = "slightly_above_market";
        explanation = `The asking rent is ${pct.toFixed(0)}% above the ${apt.lga} LGA market index. This is slightly premium — may be justified by amenities or location within the LGA.`;
    } else {
        verdict = "significantly_overpriced";
        explanation = `The asking rent is ${pct.toFixed(0)}% above the LGA market index. This is significantly above market rate — consider negotiating or looking at alternatives.`;
    }

    return {
        found: true,
        rpi_available: true,
        apartment_title: apt.title,
        ppid: apt.ppid,
        annual_rent: apt.annual_rent,
        annual_rent_formatted: formatNaira(apt.annual_rent),
        lga_rpi_value: rpiRow.rpi_value,
        lga_rpi_formatted: formatNaira(Math.round(rpiRow.rpi_value)),
        index_type: indexType,
        period: `${rpiRow.year}-${String(rpiRow.month).padStart(2, "0")}`,
        difference: delta,
        difference_formatted: `${delta >= 0 ? "+" : ""}${formatNaira(Math.round(Math.abs(delta)))}`,
        percent_vs_market: `${pct >= 0 ? "+" : ""}${pct.toFixed(1)}%`,
        verdict,
        explanation,
        market_trend: rpiRow.trend,
        market_trend_percent: rpiRow.trend_percent,
        confidence,
        recommendation: verdict === "fairly_priced" || verdict === "good_value" || verdict === "exceptional_value"
            ? "Recommend proceeding if other criteria match."
            : "Consider negotiating the rent or asking Victoria to find alternatives in the same LGA.",
    };
}

type TenancyJurisdiction = "lagos" | "port-harcourt" | "abuja";

const TENANCY_JURISDICTION_META: Record<TenancyJurisdiction, {
    stateOrFct: string;
    courtVenue: string;
    addendumTitle: string;
    governingLawLine: string;
}> = {
    lagos: {
        stateOrFct: "Lagos State",
        courtVenue: "courts of competent jurisdiction in Lagos State",
        addendumTitle: "Lagos State Addendum",
        governingLawLine:
            "This Agreement is governed by laws applicable in Lagos State, including relevant tenancy and recovery of premises laws, together with applicable federal laws.",
    },
    "port-harcourt": {
        stateOrFct: "Rivers State (Port Harcourt)",
        courtVenue: "courts of competent jurisdiction in Rivers State",
        addendumTitle: "Port Harcourt (Rivers State) Addendum",
        governingLawLine:
            "This Agreement is governed by laws applicable in Rivers State, including relevant tenancy and recovery of premises laws, together with applicable federal laws.",
    },
    abuja: {
        stateOrFct: "Federal Capital Territory (Abuja)",
        courtVenue: "courts of competent jurisdiction in the FCT, Abuja",
        addendumTitle: "Abuja (FCT) Addendum",
        governingLawLine:
            "This Agreement is governed by laws applicable in the FCT, Abuja, including relevant tenancy and recovery of premises laws, together with applicable federal laws.",
    },
};

export const generateTenancyAgreementTemplate = tool({
    description:
        "Generate a state-specific Nigerian residential tenancy agreement template for Lagos, Port Harcourt (Rivers), or Abuja (FCT). Includes compliance-oriented clauses, placeholders, and a jurisdiction-specific legal addendum.",
    inputSchema: z.object({
        jurisdiction: z
            .enum(["lagos", "port-harcourt", "abuja"])
            .describe("The target jurisdiction for the tenancy agreement template"),
        fixed_term_months: z
            .number()
            .int()
            .min(1)
            .max(36)
            .default(12)
            .describe("Intended fixed term duration in months"),
        include_inventory_schedule: z
            .boolean()
            .default(true)
            .describe("Whether to include inventory and condition schedule section"),
    }),
    execute: async ({ jurisdiction, fixed_term_months, include_inventory_schedule }) => {
        const meta = TENANCY_JURISDICTION_META[jurisdiction];

        const inventorySection = include_inventory_schedule
            ? `\nINVENTORY & CONDITION SCHEDULE (ATTACH)\n1. Keys issued: [LIST]\n2. Meter readings at move-in: [ELECTRICITY/WATER]\n3. Condition report/photos signed by both parties.\n`
            : "";

        const template = `NIGERIA RESIDENTIAL TENANCY AGREEMENT (${meta.stateOrFct.toUpperCase()} VERSION)\n\nThis Tenancy Agreement is made on [DATE]\n\nBetween:\n\nLandlord:\nName: [LANDLORD FULL NAME]\nAddress: [LANDLORD ADDRESS]\nPhone/Email: [CONTACT]\n\nAnd\n\nTenant:\nName: [TENANT FULL NAME]\nAddress: [TENANT CURRENT ADDRESS]\nPhone/Email: [CONTACT]\nID Type/No: [NIN/PASSPORT/DRIVER LICENSE]\n\nProperty:\nFull Address: [PROPERTY ADDRESS]\nState/FCT: ${meta.stateOrFct}\nUse: Residential only\n\n1. Term\nThis tenancy starts on [START DATE] and runs for ${fixed_term_months} month(s), ending on [END DATE], unless renewed or lawfully terminated earlier under this Agreement and applicable law.\n\n2. Rent\n1. Annual/Periodic Rent: NGN [AMOUNT]\n2. Payment Frequency: [MONTHLY/QUARTERLY/ANNUAL]\n3. Payment Due Date: [DATE]\n4. Payment Method: [BANK TRANSFER/OTHER]\n5. Landlord Account Details: [BANK/ACCOUNT NAME/NUMBER]\n\nTenant shall receive written or digital acknowledgment for each payment.\n\n3. Security Deposit (Caution Fee)\n1. Deposit Amount: NGN [AMOUNT]\n2. Purpose: Damage beyond fair wear and tear, unpaid utilities, or unpaid rent.\n3. Refund Timeline: Within [14/30] days after handover, less lawful deductions itemized in writing.\n\n4. Other Charges (If Any)\nThe following are payable only if lawful and agreed in writing:\n1. Service charge: NGN [AMOUNT]\n2. Waste disposal: NGN [AMOUNT]\n3. Estate/power backup dues: NGN [AMOUNT]\nNo hidden or undocumented charges shall be imposed.\n\n5. Use and Occupancy\n1. Tenant shall use the property solely for residential purposes.\n2. No unlawful activity, nuisance, or overcrowding.\n3. Subletting/assignment requires prior written consent of Landlord.\n\n6. Repairs and Maintenance\n1. Landlord handles structural repairs and major defects not caused by Tenant.\n2. Tenant handles minor day-to-day maintenance and keeps premises clean.\n3. Tenant must notify Landlord promptly of defects.\n4. Emergency repair contacts/procedure: [INSERT].\n\n7. Utilities\nResponsibility is as follows unless otherwise agreed in writing:\nWater: [TENANT/LANDLORD]\nElectricity: [TENANT/LANDLORD]\nGas/Internet: [TENANT/LANDLORD]\n\n8. Access and Inspection\nLandlord/agent may inspect with reasonable prior notice (except emergencies), at reasonable hours, and with respect for Tenant privacy.\n\n9. Alterations\nNo structural alterations without written Landlord consent. Approved improvements become part of the property unless otherwise agreed in writing.\n\n10. Default\nIf Tenant materially breaches this Agreement, Landlord may enforce remedies allowed by law, including statutory notices and court process where required. No self-help eviction, lockout, harassment, or unlawful utility disconnection.\n\n11. Termination\n1. Either party may terminate by lawful notice consistent with applicable law and tenancy type.\n2. Tenant shall hand over vacant possession on termination date.\n3. Outstanding bills and lawful damage deductions may be set off against deposit with statement.\n\n12. Dispute Resolution and Jurisdiction\nParties shall first attempt good-faith negotiation and mediation. If unresolved, disputes may be referred to ${meta.courtVenue}.\n\n13. Governing Law\n${meta.governingLawLine}\n\n14. Entire Agreement\nThis document and schedules contain the full agreement. Any change must be in writing and signed by both parties.\n\n${meta.addendumTitle}\n1. Statutory notices for termination/recovery of premises must follow applicable law and tenancy type.\n2. Possession recovery must follow due legal process, including court process where required.\n3. Parties should complete stamping/registration where required under applicable law.\n4. Parties should seek local legal review before execution for transaction-specific compliance.\n${inventorySection}\nEXECUTION\n\nLandlord Signature: __________________  Date: __________\n\nTenant Signature: ____________________  Date: __________\n\nWitness 1 Name/Signature: _____________ Date: __________\n\nWitness 2 Name/Signature: _____________ Date: __________`;

        return {
            success: true,
            jurisdiction,
            state_or_fct: meta.stateOrFct,
            fixed_term_months,
            legal_notice:
                "Template is compliance-oriented and informational. Final document should be reviewed by a qualified Nigerian property lawyer in the target jurisdiction before signing.",
            template,
        };
    },
});

export const agentTools = {
    searchApartments,
    semanticSearchApartments,
    semanticSearchKnowledge,
    webSearch,
    getRentalPriceIndex,
    compareRpiAcrossLgas,
    assessRentVsMarket,
    getApartmentDetails,
    checkAffordability,
    getNeighborhoodInfo,
    generateTenancyAgreementTemplate,
    saveApartment,
    createInquiry,
};
