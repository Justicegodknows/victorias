import { createSupabaseServer } from "@/app/lib/supabase/server";
import Link from "next/link";
import {
    APARTMENT_TYPE_LABELS,
    CITY_LABELS,
} from "@/app/lib/data/neighborhoods";
import { formatNaira } from "@/app/lib/ai/affordability";
import type { City, ApartmentType } from "@/app/lib/types";
import { RpiBadge } from "@/app/components/rpi/rpi-badge";
import type { RpiBadgeData } from "@/app/components/rpi/rpi-badge";

export default async function BrowsePage({
    searchParams,
}: {
    searchParams: Promise<Record<string, string | string[] | undefined>>;
}): Promise<React.ReactElement> {
    const params = await searchParams;
    const city = typeof params.city === "string" ? (params.city as City) : undefined;
    const type = typeof params.type === "string" ? (params.type as ApartmentType) : undefined;
    const maxRent = typeof params.max_rent === "string" ? parseInt(params.max_rent, 10) : undefined;

    const supabase = await createSupabaseServer();

    type BrowseApartment = {
        id: string;
        ppid: string;
        title: string;
        apartment_type: string;
        annual_rent: number;
        total_upfront_cost: number;
        city: string;
        neighborhood: string;
        lga: string;
        apartment_images: Array<{ image_url: string; is_primary: boolean }>;
        apartment_amenities: Array<{ amenity: string }>;
        environmental_factors: Array<{ power_supply_rating: number; security_rating: number; flood_risk: string }>;
    };

    let query = supabase
        .from("apartments")
        .select(`
            id, ppid, title, apartment_type, annual_rent, total_upfront_cost,
      city, neighborhood, lga,
      apartment_images(image_url, is_primary),
      apartment_amenities(amenity),
      environmental_factors(power_supply_rating, security_rating, flood_risk)
    `)
        .eq("is_available", true)
        .order("created_at", { ascending: false })
        .limit(20);

    if (city) query = query.eq("city", city);
    if (type) query = query.eq("apartment_type", type);
    if (maxRent && !isNaN(maxRent)) query = query.lte("annual_rent", maxRent);

    const { data: apartments } = await query.overrideTypes<BrowseApartment[]>();

    type LgaRpiRow = {
        city: string;
        lga: string;
        apartment_type: string;
        year: number;
        month: number;
        rpi_value: number;
        hist_component: number | null;
        comp_component: number | null;
        inflation_component: number;
        sample_size_hist: number;
        sample_size_comp: number;
    };

    const cities = [...new Set((apartments ?? []).map((apt) => apt.city as City))];
    const lgas = [...new Set((apartments ?? []).map((apt) => apt.lga))];

    // Fetch latest 2 months so we can compute trend_percent in JS
    const { data: rpiRows } =
        cities.length > 0 && lgas.length > 0
            ? await supabase
                .from("lga_rpi_monthly")
                .select(
                    "city, lga, apartment_type, year, month, rpi_value, hist_component, comp_component, inflation_component, sample_size_hist, sample_size_comp",
                )
                .eq("apartment_type", "all")
                .in("city", cities)
                .in("lga", lgas)
                .order("year", { ascending: false })
                .order("month", { ascending: false })
                .limit(lgas.length * 2)
                .overrideTypes<LgaRpiRow[]>()
            : { data: [] as LgaRpiRow[] };

    // Take the two most recent months per LGA to calculate trend
    const rpiLatest = new Map<string, LgaRpiRow>();
    const rpiPrev = new Map<string, LgaRpiRow>();
    for (const row of rpiRows ?? []) {
        const key = `${row.city}:${row.lga}`;
        if (!rpiLatest.has(key)) {
            rpiLatest.set(key, row);
        } else if (!rpiPrev.has(key)) {
            rpiPrev.set(key, row);
        }
    }

    const rpiByLga = new Map<string, RpiBadgeData>();
    for (const [key, latest] of rpiLatest) {
        const prev = rpiPrev.get(key);
        const trendPercent =
            prev && prev.rpi_value > 0
                ? parseFloat((((latest.rpi_value - prev.rpi_value) / prev.rpi_value) * 100).toFixed(2))
                : 0;
        const trend: "up" | "down" | "stable" =
            trendPercent > 0.1 ? "up" : trendPercent < -0.1 ? "down" : "stable";
        rpiByLga.set(key, {
            city: latest.city,
            lga: latest.lga,
            rpi_value: latest.rpi_value,
            year: latest.year,
            month: latest.month,
            trend,
            trend_percent: trendPercent,
            hist_component: latest.hist_component,
            comp_component: latest.comp_component,
            inflation_component: latest.inflation_component,
            sample_size_hist: latest.sample_size_hist,
            sample_size_comp: latest.sample_size_comp,
        });
    }

    const shownRpiValues = (apartments ?? [])
        .map((apt) => rpiByLga.get(`${apt.city}:${apt.lga}`)?.rpi_value)
        .filter((value): value is number => typeof value === "number");

    const averageRpi =
        shownRpiValues.length > 0
            ? shownRpiValues.reduce((sum, value) => sum + value, 0) / shownRpiValues.length
            : null;

    const risingLgaCount = [...rpiByLga.values()].filter((r) => r.trend === "up").length;
    const fallingLgaCount = [...rpiByLga.values()].filter((r) => r.trend === "down").length;

    return (
        <div className="mx-auto w-full max-w-6xl">
            {/* Editorial header */}
            <div className="mb-10">
                <span className="font-mono text-[#7b5d43] dark:text-amber-400 uppercase tracking-[0.3em] font-bold text-[10px]">
                    Curated Collection
                </span>
                <div className="flex items-end justify-between mt-2">
                    <h1 className="font-(family-name:--font-manrope) text-3xl font-bold text-[#2a221d] dark:text-zinc-50">
                        Browse Apartments
                    </h1>
                    <Link
                        href="/tenant"
                        className="text-[#7b5d43] dark:text-amber-400 font-bold text-sm flex items-center gap-1 hover:gap-2 transition-all"
                    >
                        Ask Victoria AI →
                    </Link>
                </div>
            </div>

            {/* Filters */}
            <form className="flex flex-wrap gap-3 mb-10">
                <select
                    name="city"
                    defaultValue={city ?? ""}
                    aria-label="Filter by city"
                    className="bg-[#f8efe7] dark:bg-zinc-900 border-none rounded-xl px-4 py-3 text-sm font-medium text-[#2a221d] dark:text-zinc-50 focus:ring-2 focus:ring-[#7b5d43]/20"
                >
                    <option value="">All Cities</option>
                    {Object.entries(CITY_LABELS).map(([value, label]) => (
                        <option key={value} value={value}>{label}</option>
                    ))}
                </select>

                <select
                    name="type"
                    defaultValue={type ?? ""}
                    aria-label="Filter by apartment type"
                    className="bg-[#f8efe7] dark:bg-zinc-900 border-none rounded-xl px-4 py-3 text-sm font-medium text-[#2a221d] dark:text-zinc-50 focus:ring-2 focus:ring-[#7b5d43]/20"
                >
                    <option value="">All Types</option>
                    {Object.entries(APARTMENT_TYPE_LABELS).map(([value, label]) => (
                        <option key={value} value={value}>{label}</option>
                    ))}
                </select>

                <select
                    name="max_rent"
                    defaultValue={maxRent?.toString() ?? ""}
                    aria-label="Filter by maximum rent"
                    className="bg-[#f8efe7] dark:bg-zinc-900 border-none rounded-xl px-4 py-3 text-sm font-medium text-[#2a221d] dark:text-zinc-50 focus:ring-2 focus:ring-[#7b5d43]/20"
                >
                    <option value="">Any Budget</option>
                    <option value="500000">Up to ₦500,000</option>
                    <option value="1000000">Up to ₦1,000,000</option>
                    <option value="2000000">Up to ₦2,000,000</option>
                    <option value="3000000">Up to ₦3,000,000</option>
                    <option value="5000000">Up to ₦5,000,000</option>
                    <option value="10000000">Up to ₦10,000,000</option>
                </select>

                <button
                    type="submit"
                    className="bg-[#7b5d43] text-white px-6 py-3 rounded-xl text-sm font-bold hover:bg-[#d78f45] transition-colors"
                >
                    Filter
                </button>
            </form>

            {/* Results grid */}
            {averageRpi !== null && (
                <div className="mb-6 rounded-2xl border border-amber-100 bg-amber-50/60 px-5 py-4 dark:border-amber-900/40 dark:bg-amber-950/30">
                    <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-amber-700 dark:text-amber-400">Market Index Snapshot</p>
                    <div className="mt-2 flex flex-wrap items-baseline gap-4">
                        <p className="text-2xl font-black text-amber-800 dark:text-amber-300">{formatNaira(Math.round(averageRpi))}</p>
                        <p className="text-xs text-amber-700/80 dark:text-amber-400/80">Average RPI across shown LGAs</p>
                    </div>
                    {(risingLgaCount > 0 || fallingLgaCount > 0) && (
                        <div className="mt-2 flex flex-wrap gap-3">
                            {risingLgaCount > 0 && (
                                <span className="text-[10px] font-bold text-red-500">
                                    ↑ {risingLgaCount} LGA{risingLgaCount > 1 ? "s" : ""} trending up
                                </span>
                            )}
                            {fallingLgaCount > 0 && (
                                <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400">
                                    ↓ {fallingLgaCount} LGA{fallingLgaCount > 1 ? "s" : ""} trending down — potential value
                                </span>
                            )}
                        </div>
                    )}
                </div>
            )}

            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {apartments && apartments.length > 0 ? (
                    apartments.map((apt) => {
                        const primaryImage = apt.apartment_images?.find((img) => img.is_primary)?.image_url;
                        const amenities = apt.apartment_amenities?.map((a) => a.amenity) ?? [];
                        const env = apt.environmental_factors?.[0];
                        const areaRpi = rpiByLga.get(`${apt.city}:${apt.lga}`);

                        return (
                            <Link
                                key={apt.id}
                                href={`/tenant/apartments/${apt.id}`}
                                className="group bg-white dark:bg-zinc-900 rounded-3xl overflow-hidden ambient-shadow hover:shadow-xl transition-all"
                            >
                                <div className="relative h-48">
                                    {primaryImage ? (
                                        <img src={primaryImage} alt={apt.title} className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                    ) : (
                                        <div className="h-full bg-linear-to-br from-amber-100 to-amber-50 dark:from-zinc-800 dark:to-zinc-900 flex items-center justify-center">
                                            <span className="text-4xl">🏠</span>
                                        </div>
                                    )}
                                    <div className="absolute top-3 right-3 bg-[#7b5d43] text-white text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-tighter">
                                        Verified
                                    </div>
                                </div>
                                <div className="p-5">
                                    <h3 className="font-(family-name:--font-geist-sans) font-bold text-[#2a221d] dark:text-zinc-50 group-hover:text-[#7b5d43] dark:group-hover:text-amber-400 transition-colors">
                                        {apt.title}
                                    </h3>
                                    <p className="mt-1 text-[10px] font-mono uppercase tracking-[0.2em] text-zinc-400">{apt.ppid}</p>
                                    <p className="mt-1 text-sm text-[#6a5e54] dark:text-zinc-400">
                                        {APARTMENT_TYPE_LABELS[apt.apartment_type as keyof typeof APARTMENT_TYPE_LABELS]} · {apt.neighborhood}, {CITY_LABELS[apt.city as keyof typeof CITY_LABELS]}
                                    </p>
                                    {areaRpi && (
                                        <div className="mt-2">
                                            <RpiBadge data={areaRpi} />
                                        </div>
                                    )}
                                    <div className="mt-3 flex items-baseline justify-between">
                                        <span className="font-mono text-lg font-black text-[#7b5d43] dark:text-amber-400">
                                            {formatNaira(apt.annual_rent)}<span className="text-xs font-normal text-zinc-400">/yr</span>
                                        </span>
                                        <span className="text-[10px] text-zinc-400">
                                            Total: {formatNaira(apt.total_upfront_cost)}
                                        </span>
                                    </div>
                                    {amenities.length > 0 && (
                                        <div className="mt-3 flex flex-wrap gap-1">
                                            {amenities.slice(0, 3).map((a) => (
                                                <span key={a} className="px-2 py-1 bg-[#f8efe7] dark:bg-zinc-800 rounded-full text-[9px] font-semibold text-zinc-600 dark:text-zinc-400">
                                                    {a}
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                    {env && (
                                        <div className="mt-3 grid grid-cols-3 gap-1 pt-3 border-t border-zinc-100 dark:border-zinc-800">
                                            <div className="flex flex-col items-center">
                                                <span className="text-xs text-amber-500">⚡</span>
                                                <span className="text-[8px] uppercase font-bold text-zinc-400">{env.power_supply_rating}/5</span>
                                            </div>
                                            <div className="flex flex-col items-center border-x border-zinc-100 dark:border-zinc-800">
                                                <span className="text-xs text-amber-500">🛡️</span>
                                                <span className="text-[8px] uppercase font-bold text-zinc-400">{env.security_rating}/5</span>
                                            </div>
                                            <div className="flex flex-col items-center">
                                                <span className="text-xs text-amber-500">🌊</span>
                                                <span className="text-[8px] uppercase font-bold text-zinc-400">{env.flood_risk}</span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </Link>
                        );
                    })
                ) : (
                    <div className="col-span-full py-20 text-center">
                        <p className="text-[#6a5e54] dark:text-zinc-400">No apartments found. Try adjusting your filters.</p>
                        <Link href="/tenant" className="mt-3 inline-block text-sm font-bold text-[#7b5d43] dark:text-amber-400 hover:underline underline-offset-4">
                            Ask Victoria AI for help
                        </Link>
                    </div>
                )}
            </div>
        </div>
    );
}
