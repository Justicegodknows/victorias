import { createSupabaseServer } from "@/app/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import {
    APARTMENT_TYPE_LABELS,
    AMENITY_LABELS,
    CITY_LABELS,
} from "@/app/lib/data/neighborhoods";
import { formatNaira } from "@/app/lib/ai/affordability";

export default async function ApartmentDetailPage({
    params,
}: {
    params: Promise<{ id: string }>;
}): Promise<React.ReactElement> {
    const { id } = await params;
    const supabase = await createSupabaseServer();

    type ApartmentDetail = {
        id: string;
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

    const amenities = apartment.apartment_amenities?.map((a) => a.amenity) ?? [];
    const images = apartment.apartment_images
        ?.sort((a, b) => (a.is_primary ? -1 : b.is_primary ? 1 : a.display_order - b.display_order)) ?? [];
    const env = apartment.environmental_factors;
    const landlord = apartment.profiles;

    return (
        <div className="mx-auto w-full max-w-4xl px-4 py-8">
            <Link href="/tenant/browse" className="mb-4 inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200">
                ← Back to browse
            </Link>

            {/* Image gallery */}
            {images.length > 0 && (
                <div className="grid gap-2 rounded-xl overflow-hidden" style={{ gridTemplateColumns: images.length > 1 ? "2fr 1fr" : "1fr" }}>
                    <div className="h-72 bg-zinc-100 dark:bg-zinc-700">
                        <img src={images[0].image_url} alt={apartment.title} className="h-full w-full object-cover" />
                    </div>
                    {images.length > 1 && (
                        <div className="grid gap-2">
                            {images.slice(1, 3).map((img, i) => (
                                <div key={i} className="h-[calc(50%-4px)] bg-zinc-100 dark:bg-zinc-700">
                                    <img src={img.image_url} alt="" className="h-full w-full object-cover" />
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            <div className="mt-6 grid gap-8 lg:grid-cols-3">
                {/* Main info */}
                <div className="lg:col-span-2 space-y-6">
                    <div>
                        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">{apartment.title}</h1>
                        <p className="mt-1 text-zinc-500 dark:text-zinc-400">
                            {APARTMENT_TYPE_LABELS[apartment.apartment_type as keyof typeof APARTMENT_TYPE_LABELS]} · {apartment.neighborhood}, {apartment.lga}, {CITY_LABELS[apartment.city as keyof typeof CITY_LABELS]}
                        </p>
                    </div>

                    {apartment.description && (
                        <div>
                            <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Description</h2>
                            <p className="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
                                {apartment.description}
                            </p>
                        </div>
                    )}

                    {/* Amenities */}
                    {amenities.length > 0 && (
                        <div>
                            <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Amenities</h2>
                            <div className="mt-3 grid grid-cols-2 gap-2">
                                {amenities.map((amenity) => (
                                    <div key={amenity} className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
                                        <span className="text-green-600">✓</span>
                                        {AMENITY_LABELS[amenity] ?? amenity}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Environmental factors */}
                    {env && (
                        <div>
                            <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Environmental Factors</h2>
                            <div className="mt-3 grid gap-4 sm:grid-cols-2">
                                <div className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-700">
                                    <p className="text-xs text-zinc-500 dark:text-zinc-400">Power Supply</p>
                                    <div className="mt-1 flex gap-1">
                                        {Array.from({ length: 5 }).map((_, i) => (
                                            <div key={i} className={`h-2 w-6 rounded-full ${i < env.power_supply_rating ? "bg-green-500" : "bg-zinc-200 dark:bg-zinc-600"}`} />
                                        ))}
                                    </div>
                                </div>
                                <div className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-700">
                                    <p className="text-xs text-zinc-500 dark:text-zinc-400">Water Supply</p>
                                    <div className="mt-1 flex gap-1">
                                        {Array.from({ length: 5 }).map((_, i) => (
                                            <div key={i} className={`h-2 w-6 rounded-full ${i < env.water_supply_rating ? "bg-blue-500" : "bg-zinc-200 dark:bg-zinc-600"}`} />
                                        ))}
                                    </div>
                                </div>
                                <div className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-700">
                                    <p className="text-xs text-zinc-500 dark:text-zinc-400">Security</p>
                                    <div className="mt-1 flex gap-1">
                                        {Array.from({ length: 5 }).map((_, i) => (
                                            <div key={i} className={`h-2 w-6 rounded-full ${i < env.security_rating ? "bg-amber-500" : "bg-zinc-200 dark:bg-zinc-600"}`} />
                                        ))}
                                    </div>
                                </div>
                                <div className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-700">
                                    <p className="text-xs text-zinc-500 dark:text-zinc-400">Road Condition</p>
                                    <div className="mt-1 flex gap-1">
                                        {Array.from({ length: 5 }).map((_, i) => (
                                            <div key={i} className={`h-2 w-6 rounded-full ${i < env.road_condition_rating ? "bg-purple-500" : "bg-zinc-200 dark:bg-zinc-600"}`} />
                                        ))}
                                    </div>
                                </div>
                                <div className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-700">
                                    <p className="text-xs text-zinc-500 dark:text-zinc-400">Flood Risk</p>
                                    <p className={`mt-1 text-sm font-medium capitalize ${env.flood_risk === "low" ? "text-green-600" :
                                        env.flood_risk === "medium" ? "text-amber-600" : "text-red-600"
                                        }`}>
                                        {env.flood_risk}
                                    </p>
                                </div>
                            </div>
                            {(env.nearest_bus_stop || env.nearest_market || env.nearest_hospital) && (
                                <div className="mt-3 space-y-1 text-sm text-zinc-600 dark:text-zinc-400">
                                    {env.nearest_bus_stop && <p>🚌 Nearest bus stop: {env.nearest_bus_stop}</p>}
                                    {env.nearest_market && <p>🛒 Nearest market: {env.nearest_market}</p>}
                                    {env.nearest_hospital && <p>🏥 Nearest hospital: {env.nearest_hospital}</p>}
                                </div>
                            )}
                            {env.traffic_notes && (
                                <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                                    🚗 {env.traffic_notes}
                                </p>
                            )}
                        </div>
                    )}
                </div>

                {/* Sidebar — pricing + contact */}
                <div className="space-y-4">
                    <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-700 dark:bg-zinc-800">
                        <p className="text-2xl font-bold text-green-600">{formatNaira(apartment.annual_rent)}</p>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400">per year</p>

                        <div className="mt-4 space-y-2 text-sm">
                            <div className="flex justify-between text-zinc-600 dark:text-zinc-400">
                                <span>Annual Rent</span>
                                <span>{formatNaira(apartment.annual_rent)}</span>
                            </div>
                            <div className="flex justify-between text-zinc-600 dark:text-zinc-400">
                                <span>Caution Deposit</span>
                                <span>{formatNaira(apartment.deposit)}</span>
                            </div>
                            <div className="flex justify-between text-zinc-600 dark:text-zinc-400">
                                <span>Agent Fee</span>
                                <span>{formatNaira(apartment.agent_fee)}</span>
                            </div>
                            <div className="flex justify-between border-t border-zinc-200 pt-2 font-semibold text-zinc-900 dark:border-zinc-700 dark:text-zinc-50">
                                <span>Total Upfront</span>
                                <span>{formatNaira(apartment.total_upfront_cost)}</span>
                            </div>
                        </div>

                        <Link
                            href={`/tenant?ask=Tell me more about the apartment "${apartment.title}" in ${apartment.neighborhood}`}
                            className="mt-4 block w-full rounded-lg bg-green-600 px-4 py-2.5 text-center text-sm font-medium text-white hover:bg-green-700"
                        >
                            Ask Victoria about this
                        </Link>
                    </div>

                    {landlord && (
                        <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-700 dark:bg-zinc-800">
                            <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Listed by</h3>
                            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{landlord.full_name}</p>
                            {landlord.phone && (
                                <a
                                    href={`https://wa.me/${landlord.phone.replace(/\D/g, "")}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="mt-3 inline-flex items-center gap-2 rounded-lg bg-green-50 px-3 py-2 text-sm font-medium text-green-700 hover:bg-green-100 dark:bg-green-950 dark:text-green-400 dark:hover:bg-green-900"
                                >
                                    Chat on WhatsApp
                                </a>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
