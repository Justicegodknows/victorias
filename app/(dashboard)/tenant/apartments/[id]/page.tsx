import { createSupabaseServer } from "@/app/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import {
    APARTMENT_TYPE_LABELS,
    AMENITY_LABELS,
    CITY_LABELS,
} from "@/app/lib/data/neighborhoods";
import { formatNaira } from "@/app/lib/ai/affordability";
import { RpiBadge } from "@/app/components/rpi/rpi-badge";
import type { RpiBadgeData } from "@/app/components/rpi/rpi-badge";

export default async function ApartmentDetailPage({
    params,
}: {
    params: Promise<{ id: string }>;
}): Promise<React.ReactElement> {
    const { id } = await params;
    const supabase = await createSupabaseServer();

    type ApartmentDetail = {
        id: string;
        ppid: string;
        title: string;
        description: string;
        apartment_type: string;
        annual_rent: number;
        deposit: number;
        agent_fee: number;
        total_upfront_cost: number;
        address: string;
        city: string;
        lga: string;
        neighborhood: string;
        apartment_amenities: Array<{ amenity: string }>;
        apartment_images: Array<{ image_url: string; is_primary: boolean; display_order: number }>;
        environmental_factors: {
            flood_risk: string;
            power_supply_rating: number;
            water_supply_rating: number;
            security_rating: number;
            road_condition_rating: number;
            nearest_bus_stop: string | null;
            nearest_market: string | null;
            nearest_hospital: string | null;
            traffic_notes: string | null;
        } | null;
        profiles: { full_name: string; phone: string | null } | null;
    };

    const { data: apartment } = await supabase
        .from("apartments")
        .select(`
      *,
      apartment_amenities(amenity),
      apartment_images(image_url, is_primary, display_order),
      environmental_factors(*),
      profiles!apartments_landlord_id_fkey(full_name, phone)
    `)
        .eq("id", id)
        .single()
        .overrideTypes<ApartmentDetail, { merge: false }>();

    if (!apartment) {
        notFound();
    }

    // Fetch RPI for this apartment's LGA (latest 2 months for trend)
    type RpiRow = {
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
    const { data: rpiRows } = await supabase
        .from("lga_rpi_monthly")
        .select(
            "city, lga, apartment_type, year, month, rpi_value, hist_component, comp_component, inflation_component, sample_size_hist, sample_size_comp",
        )
        .eq("city", apartment.city as import("@/app/lib/types").City)
        .eq("lga", apartment.lga)
        .eq("apartment_type", "all")
        .order("year", { ascending: false })
        .order("month", { ascending: false })
        .limit(2)
        .overrideTypes<RpiRow[]>();

    let rpiData: RpiBadgeData | null = null;
    if (rpiRows && rpiRows.length > 0) {
        const latest = rpiRows[0];
        const prev = rpiRows[1];
        const trendPercent =
            prev && prev.rpi_value > 0
                ? parseFloat((((latest.rpi_value - prev.rpi_value) / prev.rpi_value) * 100).toFixed(2))
                : 0;
        const trend: "up" | "down" | "stable" =
            trendPercent > 0.1 ? "up" : trendPercent < -0.1 ? "down" : "stable";
        rpiData = {
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
        };
    }

    const amenities = apartment.apartment_amenities?.map((a) => a.amenity) ?? [];
    const images = apartment.apartment_images
        ?.sort((a, b) => (a.is_primary ? -1 : b.is_primary ? 1 : a.display_order - b.display_order)) ?? [];
    const env = apartment.environmental_factors;
    const landlord = apartment.profiles;

    return (
        <div className="mx-auto w-full max-w-6xl">
            <Link href="/tenant/browse" className="mb-6 inline-flex items-center gap-2 text-sm text-[#6a5e54] dark:text-zinc-400 hover:text-[#7b5d43] dark:hover:text-amber-400 transition-colors font-medium">
                ← Back to browse
            </Link>

            {/* Hero image gallery */}
            {images.length > 0 && (
                <div className={`grid gap-2 rounded-3xl overflow-hidden ${images.length > 1 ? "grid-cols-[2fr_1fr]" : "grid-cols-1"}`}>
                    <div className="h-80 bg-zinc-100 dark:bg-zinc-800">
                        <img src={images[0].image_url} alt={apartment.title} className="h-full w-full object-cover" />
                    </div>
                    {images.length > 1 && (
                        <div className="grid gap-2">
                            {images.slice(1, 3).map((img, i) => (
                                <div key={i} className="h-[calc(50%-4px)] bg-zinc-100 dark:bg-zinc-800">
                                    <img src={img.image_url} alt="" className="h-full w-full object-cover" />
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            <div className="mt-8 grid gap-8 lg:grid-cols-3">
                {/* Main info */}
                <div className="lg:col-span-2 space-y-8">
                    <div>
                        <span className="font-mono text-[#7b5d43] dark:text-amber-400 uppercase tracking-[0.3em] font-bold text-[10px]">
                            {APARTMENT_TYPE_LABELS[apartment.apartment_type as keyof typeof APARTMENT_TYPE_LABELS]}
                        </span>
                        <h1 className="font-(family-name:--font-manrope) text-3xl font-bold text-[#2a221d] dark:text-zinc-50 mt-2">{apartment.title}</h1>
                        <p className="mt-1 text-[11px] font-mono uppercase tracking-[0.2em] text-zinc-400">{apartment.ppid}</p>
                        <p className="mt-2 text-[#6a5e54] dark:text-zinc-400">
                            {apartment.neighborhood}, {apartment.lga}, {CITY_LABELS[apartment.city as keyof typeof CITY_LABELS]}
                        </p>
                    </div>

                    {apartment.description && (
                        <div className="bg-[#f8efe7] dark:bg-zinc-900 rounded-2xl p-6">
                            <h2 className="font-(family-name:--font-geist-sans) font-bold text-[#2a221d] dark:text-zinc-50 mb-3">About this property</h2>
                            <p className="text-sm leading-relaxed text-[#6a5e54] dark:text-zinc-400">
                                {apartment.description}
                            </p>
                        </div>
                    )}

                    {/* Amenities */}
                    {amenities.length > 0 && (
                        <div>
                            <h2 className="font-(family-name:--font-geist-sans) font-bold text-[#2a221d] dark:text-zinc-50 mb-4">Amenities</h2>
                            <div className="grid grid-cols-2 gap-3">
                                {amenities.map((amenity) => (
                                    <div key={amenity} className="flex items-center gap-3 bg-[#f8efe7] dark:bg-zinc-900 rounded-xl px-4 py-3 text-sm text-[#2a221d] dark:text-zinc-50">
                                        <span className="text-[#7b5d43] dark:text-amber-400">✓</span>
                                        {AMENITY_LABELS[amenity] ?? amenity}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Environmental factors */}
                    {env && (
                        <div>
                            <h2 className="font-(family-name:--font-geist-sans) font-bold text-[#2a221d] dark:text-zinc-50 mb-4">Lifestyle Metrics</h2>
                            <div className="grid gap-4 sm:grid-cols-2">
                                {[
                                    { label: "Power Supply", rating: env.power_supply_rating, color: "emerald", icon: "⚡" },
                                    { label: "Water Supply", rating: env.water_supply_rating, color: "blue", icon: "💧" },
                                    { label: "Security", rating: env.security_rating, color: "amber", icon: "🛡️" },
                                    { label: "Road Condition", rating: env.road_condition_rating, color: "purple", icon: "🛣️" },
                                ].map((metric) => (
                                    <div key={metric.label} className="bg-white dark:bg-zinc-900 rounded-2xl p-4 ambient-shadow">
                                        <div className="flex items-center gap-2 mb-2">
                                            <span>{metric.icon}</span>
                                            <p className="text-xs font-mono uppercase tracking-[0.2em] text-zinc-400">{metric.label}</p>
                                        </div>
                                        <div className="flex gap-1">
                                            {Array.from({ length: 5 }).map((_, i) => (
                                                <div key={i} className={`h-2 flex-1 rounded-full ${i < metric.rating ? "bg-[#7b5d43]" : "bg-zinc-200 dark:bg-zinc-700"}`} />
                                            ))}
                                        </div>
                                    </div>
                                ))}
                                <div className="bg-white dark:bg-zinc-900 rounded-2xl p-4 ambient-shadow">
                                    <div className="flex items-center gap-2 mb-2">
                                        <span>🌊</span>
                                        <p className="text-xs font-mono uppercase tracking-[0.2em] text-zinc-400">Flood Risk</p>
                                    </div>
                                    <p className={`text-sm font-bold capitalize ${env.flood_risk === "low" ? "text-amber-600" :
                                        env.flood_risk === "medium" ? "text-amber-600" : "text-red-600"
                                        }`}>
                                        {env.flood_risk}
                                    </p>
                                </div>
                            </div>
                            {(env.nearest_bus_stop || env.nearest_market || env.nearest_hospital) && (
                                <div className="mt-4 bg-[#f8efe7] dark:bg-zinc-900 rounded-2xl p-5 space-y-2 text-sm text-[#6a5e54] dark:text-zinc-400">
                                    {env.nearest_bus_stop && <p>🚌 Nearest bus stop: {env.nearest_bus_stop}</p>}
                                    {env.nearest_market && <p>🛒 Nearest market: {env.nearest_market}</p>}
                                    {env.nearest_hospital && <p>🏥 Nearest hospital: {env.nearest_hospital}</p>}
                                    {env.traffic_notes && <p>🚗 {env.traffic_notes}</p>}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Sidebar — pricing + contact */}
                <div className="space-y-4 lg:sticky lg:top-28 h-fit">
                    <div className="bg-white dark:bg-zinc-900 rounded-3xl p-6 ambient-shadow">
                        <p className="font-mono text-3xl font-black text-[#7b5d43] dark:text-amber-400">{formatNaira(apartment.annual_rent)}</p>
                        <p className="text-xs text-zinc-400 font-mono uppercase tracking-[0.2em] mt-1">per year</p>

                        <div className="mt-6 space-y-3 text-sm">
                            <div className="flex justify-between text-[#6a5e54] dark:text-zinc-400">
                                <span>Annual Rent</span>
                                <span className="font-medium">{formatNaira(apartment.annual_rent)}</span>
                            </div>
                            <div className="flex justify-between text-[#6a5e54] dark:text-zinc-400">
                                <span>Caution Deposit</span>
                                <span className="font-medium">{formatNaira(apartment.deposit)}</span>
                            </div>
                            <div className="flex justify-between text-[#6a5e54] dark:text-zinc-400">
                                <span>Agent Fee</span>
                                <span className="font-medium">{formatNaira(apartment.agent_fee)}</span>
                            </div>
                            <div className="flex justify-between pt-3 border-t border-zinc-100 dark:border-zinc-800 font-bold text-[#2a221d] dark:text-zinc-50">
                                <span>Total Upfront</span>
                                <span>{formatNaira(apartment.total_upfront_cost)}</span>
                            </div>
                        </div>

                        <Link
                            href={`/tenant?ask=Tell me more about the apartment "${apartment.title}" in ${apartment.neighborhood}`}
                            className="mt-6 block w-full btn-primary-gradient text-white py-3 rounded-xl text-center font-bold shadow-lg shadow-[#7b5d43]/10 hover:scale-[1.01] active:scale-[0.98] transition-all"
                        >
                            Ask Victoria about this
                        </Link>
                    </div>

                    {rpiData && (
                        <div className="bg-white dark:bg-zinc-900 rounded-3xl p-6 ambient-shadow">
                            <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-zinc-400 mb-3">LGA Market Index</p>
                            <RpiBadge data={rpiData} />
                            {(() => {
                                const delta = apartment.annual_rent - rpiData!.rpi_value;
                                const pct = (delta / rpiData!.rpi_value) * 100;
                                if (Math.abs(pct) < 5) {
                                    return (
                                        <p className="mt-2 text-[10px] text-zinc-400">
                                            Priced in line with the LGA market index
                                        </p>
                                    );
                                }
                                const isBelow = delta < 0;
                                return (
                                    <p className={`mt-2 text-[10px] font-bold ${isBelow
                                        ? "text-amber-700 dark:text-amber-400"
                                        : "text-amber-600 dark:text-amber-400"
                                        }`}>
                                        {isBelow
                                            ? `↓ ${Math.abs(pct).toFixed(0)}% below LGA market index — strong value`
                                            : `↑ ${Math.abs(pct).toFixed(0)}% above LGA market index`}
                                    </p>
                                );
                            })()}
                        </div>
                    )}

                    {landlord && (
                        <div className="bg-white dark:bg-zinc-900 rounded-3xl p-6 ambient-shadow">
                            <h3 className="font-(family-name:--font-geist-sans) font-bold text-[#2a221d] dark:text-zinc-50 mb-2">Listed by</h3>
                            <p className="text-sm text-[#6a5e54] dark:text-zinc-400">{landlord.full_name}</p>
                            {landlord.phone && (
                                <a
                                    href={`https://wa.me/${landlord.phone.replace(/\D/g, "")}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="mt-4 inline-flex items-center gap-2 bg-[#f3ddc8] dark:bg-amber-900 px-4 py-2.5 rounded-xl text-sm font-bold text-amber-900 dark:text-amber-300 hover:bg-[#a1d3a4] dark:hover:bg-amber-800 transition-colors"
                                >
                                    💬 Chat on WhatsApp
                                </a>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
