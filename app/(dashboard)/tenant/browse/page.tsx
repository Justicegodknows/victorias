import { createSupabaseServer } from "@/app/lib/supabase/server";
import Link from "next/link";
import {
    APARTMENT_TYPE_LABELS,
    CITY_LABELS,
} from "@/app/lib/data/neighborhoods";
import { formatNaira } from "@/app/lib/ai/affordability";

export default async function BrowsePage({
    searchParams,
}: {
    searchParams: Promise<Record<string, string | string[] | undefined>>;
}): Promise<React.ReactElement> {
    const params = await searchParams;
    const city = typeof params.city === "string" ? params.city : undefined;
    const type = typeof params.type === "string" ? params.type : undefined;
    const maxRent = typeof params.max_rent === "string" ? parseInt(params.max_rent, 10) : undefined;

    const supabase = await createSupabaseServer();

    type BrowseApartment = {
        id: string;
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
      id, title, apartment_type, annual_rent, total_upfront_cost,
      city, neighborhood, lga,
      apartment_images(image_url, is_primary),
      apartment_amenities(amenity),
      environmental_factors(power_supply_rating, security_rating, flood_risk)
    `)
        .eq("is_available", true)
        .order("created_at", { ascending: false })
        .limit(20)
        .overrideTypes<BrowseApartment[]>();

    if (city) query = query.eq("city", city);
    if (type) query = query.eq("apartment_type", type);
    if (maxRent && !isNaN(maxRent)) query = query.lte("annual_rent", maxRent);

    const { data: apartments } = await query;

    return (
        <div className="mx-auto w-full max-w-7xl px-4 py-8">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
                    Browse Apartments
                </h1>
                <Link
                    href="/tenant"
                    className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
                >
                    Ask Victoria AI
                </Link>
            </div>

            {/* Filters */}
            <form className="mt-6 flex flex-wrap gap-3">
                <select
                    name="city"
                    defaultValue={city ?? ""}
                    aria-label="Filter by city"
                    className="rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-50"
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
                    className="rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-50"
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
                    className="rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-50"
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
                    className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
                >
                    Filter
                </button>
            </form>

            {/* Results grid */}
            <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {apartments && apartments.length > 0 ? (
                    apartments.map((apt) => {
                        const primaryImage = apt.apartment_images?.find((img) => img.is_primary)?.image_url;
                        const amenities = apt.apartment_amenities?.map((a) => a.amenity) ?? [];
                        const env = apt.environmental_factors?.[0];

                        return (
                            <Link
                                key={apt.id}
                                href={`/tenant/apartments/${apt.id}`}
                                className="group overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm transition-shadow hover:shadow-md dark:border-zinc-700 dark:bg-zinc-800"
                            >
                                <div className="flex h-44 items-center justify-center bg-zinc-100 dark:bg-zinc-700">
                                    {primaryImage ? (
                                        <img src={primaryImage} alt={apt.title} className="h-full w-full object-cover" />
                                    ) : (
                                        <span className="text-sm text-zinc-400">No image</span>
                                    )}
                                </div>
                                <div className="p-4">
                                    <h3 className="font-semibold text-zinc-900 group-hover:text-green-600 dark:text-zinc-50">
                                        {apt.title}
                                    </h3>
                                    <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                                        {APARTMENT_TYPE_LABELS[apt.apartment_type as keyof typeof APARTMENT_TYPE_LABELS]} · {apt.neighborhood}, {CITY_LABELS[apt.city as keyof typeof CITY_LABELS]}
                                    </p>
                                    <div className="mt-3 flex items-baseline justify-between">
                                        <span className="text-lg font-bold text-green-600">
                                            {formatNaira(apt.annual_rent)}<span className="text-xs font-normal">/yr</span>
                                        </span>
                                        <span className="text-xs text-zinc-400">
                                            Total: {formatNaira(apt.total_upfront_cost)}
                                        </span>
                                    </div>
                                    {env && (
                                        <div className="mt-2 flex gap-3 text-xs text-zinc-500 dark:text-zinc-400">
                                            <span>⚡ {env.power_supply_rating}/5</span>
                                            <span>🔒 {env.security_rating}/5</span>
                                            <span>🌊 {env.flood_risk}</span>
                                        </div>
                                    )}
                                </div>
                            </Link>
                        );
                    })
                ) : (
                    <div className="col-span-full py-20 text-center">
                        <p className="text-zinc-500 dark:text-zinc-400">No apartments found. Try adjusting your filters.</p>
                        <Link href="/tenant" className="mt-3 inline-block text-sm font-medium text-green-600 hover:text-green-500">
                            Ask Victoria AI for help
                        </Link>
                    </div>
                )}
            </div>
        </div>
    );
}
