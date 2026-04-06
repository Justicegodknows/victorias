import { tool } from "ai";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import type { Database, ApartmentWithDetails } from "@/app/lib/types";
import { calculateAffordability, formatNaira } from "@/app/lib/ai/affordability";
import { NEIGHBORHOODS } from "@/app/lib/data/neighborhoods";
import { searchApartmentsBySemantic, searchKnowledge } from "@/app/lib/ai/rag";

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

export const agentTools = {
    searchApartments,
    semanticSearchApartments,
    semanticSearchKnowledge,
    getApartmentDetails,
    checkAffordability,
    getNeighborhoodInfo,
    saveApartment,
    createInquiry,
};
