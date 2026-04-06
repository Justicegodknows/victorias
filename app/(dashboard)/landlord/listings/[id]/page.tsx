import { createSupabaseServer } from "@/app/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { APARTMENT_TYPE_LABELS, AMENITY_LABELS, CITY_LABELS } from "@/app/lib/data/neighborhoods";
import { formatNaira } from "@/app/lib/ai/affordability";
import { buildRentRecommendation } from "@/app/lib/ai/rent-recommendation";
import type { ApartmentType, City } from "@/app/lib/types";

export default async function ListingDetailPage({
    params,
}: {
    params: Promise<{ id: string }>;
}): Promise<React.ReactElement> {
    const { id } = await params;
    const supabase = await createSupabaseServer();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    type LandlordApartmentDetail = {
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
        is_available: boolean;
        is_verified: boolean;
        apartment_amenities: Array<{ amenity: string }>;
        apartment_images: Array<{ image_url: string; is_primary: boolean; display_order: number }>;
        environmental_factors: Record<string, unknown> | null;
    };

    const { data: apartment } = await supabase
        .from("apartments")
        .select(`
      *,
      apartment_amenities(amenity),
      apartment_images(image_url, is_primary, display_order),
      environmental_factors(*)
    `)
        .eq("id", id)
        .eq("landlord_id", user!.id)
        .single()
        .overrideTypes<LandlordApartmentDetail, { merge: false }>();

    if (!apartment) {
        notFound();
    }

    const amenities = apartment.apartment_amenities?.map((a) => a.amenity) ?? [];
    const images = apartment.apartment_images
        ?.sort((a, b) => a.display_order - b.display_order) ?? [];
    const env = apartment.environmental_factors;

    type ListingInquiry = {
        id: string;
        message: string;
        status: string;
        created_at: string;
        profiles: { full_name: string } | null;
    };

    // Fetch inquiries for this listing
    const { data: inquiries } = await supabase
        .from("inquiries")
        .select("id, message, status, created_at, profiles!inquiries_tenant_id_fkey(full_name)")
        .eq("apartment_id", id)
        .order("created_at", { ascending: false })
        .overrideTypes<ListingInquiry[]>();

    type ComparableRentRow = { annual_rent: number };
    const { data: comparableRows } = await supabase
        .from("apartments")
        .select("annual_rent")
        .eq("city", apartment.city as City)
        .eq("lga", apartment.lga)
        .eq("apartment_type", apartment.apartment_type as ApartmentType)
        .eq("is_available", true)
        .limit(200)
        .overrideTypes<ComparableRentRow[]>();

    type LgaRpiProbe = {
        rpi_value: number;
        sample_size_hist: number;
        sample_size_comp: number;
    };

    const { data: typeRpiRows } = await supabase
        .from("lga_rpi_monthly")
        .select("rpi_value, sample_size_hist, sample_size_comp")
        .eq("city", apartment.city as City)
        .eq("lga", apartment.lga)
        .eq("apartment_type", apartment.apartment_type as ApartmentType)
        .order("year", { ascending: false })
        .order("month", { ascending: false })
        .limit(1)
        .overrideTypes<LgaRpiProbe[]>();

    const typeRpiRow = typeRpiRows?.[0];
    const fallbackRpiRow = !typeRpiRow
        ? (await supabase
            .from("lga_rpi_monthly")
            .select("rpi_value, sample_size_hist, sample_size_comp")
            .eq("city", apartment.city as City)
            .eq("lga", apartment.lga)
            .eq("apartment_type", "all")
            .order("year", { ascending: false })
            .order("month", { ascending: false })
            .limit(1)
            .overrideTypes<LgaRpiProbe[]>()).data?.[0]
        : null;

    const marketRecommendation = buildRentRecommendation({
        comparableRents: (comparableRows ?? []).map((row) => row.annual_rent),
        rpiValue: typeRpiRow?.rpi_value ?? fallbackRpiRow?.rpi_value,
        rpiSampleSize:
            (typeRpiRow?.sample_size_hist ?? fallbackRpiRow?.sample_size_hist ?? 0)
            + (typeRpiRow?.sample_size_comp ?? fallbackRpiRow?.sample_size_comp ?? 0),
    });

    return (
        <div className="mx-auto w-full max-w-4xl px-4 py-8">
            <Link href="/landlord" className="mb-4 inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200">
                ← Back to listings
            </Link>

            <div className="flex items-start justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">{apartment.title}</h1>
                    <p className="mt-1 text-[11px] font-mono uppercase tracking-[0.2em] text-zinc-400">{apartment.ppid}</p>
                    <p className="mt-1 text-zinc-500 dark:text-zinc-400">
                        {APARTMENT_TYPE_LABELS[apartment.apartment_type as keyof typeof APARTMENT_TYPE_LABELS]} · {apartment.neighborhood}, {CITY_LABELS[apartment.city as keyof typeof CITY_LABELS]}
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <span className={`rounded-full px-3 py-1 text-xs font-medium ${apartment.is_available
                        ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-400"
                        : "bg-zinc-100 text-zinc-500 dark:bg-zinc-700 dark:text-zinc-400"
                        }`}>
                        {apartment.is_available ? "Available" : "Unavailable"}
                    </span>
                </div>
            </div>

            {/* Images */}
            {images.length > 0 && (
                <div className="mt-6 flex gap-2 overflow-x-auto rounded-xl">
                    {images.map((img, i) => (
                        <div key={i} className="h-48 w-64 flex-shrink-0 overflow-hidden rounded-lg bg-zinc-100 dark:bg-zinc-700">
                            <img src={img.image_url} alt="" className="h-full w-full object-cover" />
                        </div>
                    ))}
                </div>
            )}

            {/* Pricing */}
            <div className="mt-6 rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-700 dark:bg-zinc-800">
                <div className="grid grid-cols-4 gap-4 text-center">
                    <div>
                        <p className="text-xs text-zinc-500">Annual Rent</p>
                        <p className="text-lg font-bold text-green-600">{formatNaira(apartment.annual_rent)}</p>
                    </div>
                    <div>
                        <p className="text-xs text-zinc-500">Deposit</p>
                        <p className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">{formatNaira(apartment.deposit)}</p>
                    </div>
                    <div>
                        <p className="text-xs text-zinc-500">Agent Fee</p>
                        <p className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">{formatNaira(apartment.agent_fee)}</p>
                    </div>
                    <div>
                        <p className="text-xs text-zinc-500">Total Upfront</p>
                        <p className="text-lg font-bold text-zinc-900 dark:text-zinc-50">{formatNaira(apartment.total_upfront_cost)}</p>
                    </div>
                </div>

                {marketRecommendation && (
                    <div className="mt-5 rounded-xl border border-emerald-100 bg-emerald-50/70 px-4 py-3 dark:border-emerald-900/40 dark:bg-emerald-950/30">
                        <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-emerald-700 dark:text-emerald-400">Recommended Market Range</p>
                        <p className="mt-1 text-sm font-semibold text-emerald-900 dark:text-emerald-300">
                            {APARTMENT_TYPE_LABELS[apartment.apartment_type as keyof typeof APARTMENT_TYPE_LABELS]} in {apartment.lga}, {CITY_LABELS[apartment.city as keyof typeof CITY_LABELS]}: {formatNaira(marketRecommendation.minRent)}-{formatNaira(marketRecommendation.maxRent)}/year
                        </p>
                        <p className="mt-1 text-[10px] text-emerald-700/80 dark:text-emerald-400/80">
                            Confidence: {marketRecommendation.confidence} · Based on {marketRecommendation.source === "comparables" ? "comparable listings" : "LGA RPI"}
                        </p>
                        <p className={`mt-2 text-[11px] font-bold ${apartment.annual_rent < marketRecommendation.minRent
                                ? "text-emerald-700 dark:text-emerald-400"
                                : apartment.annual_rent > marketRecommendation.maxRent
                                    ? "text-amber-700 dark:text-amber-400"
                                    : "text-emerald-700 dark:text-emerald-400"
                            }`}>
                            {apartment.annual_rent < marketRecommendation.minRent
                                ? "Current rent is below recommended market band."
                                : apartment.annual_rent > marketRecommendation.maxRent
                                    ? "Current rent is above recommended market band."
                                    : "Current rent is within recommended market band."}
                        </p>
                    </div>
                )}
            </div>

            {/* Amenities */}
            {amenities.length > 0 && (
                <div className="mt-6">
                    <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Amenities</h2>
                    <div className="mt-2 flex flex-wrap gap-2">
                        {amenities.map((amenity) => (
                            <span key={amenity} className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-600 dark:bg-zinc-700 dark:text-zinc-300">
                                {AMENITY_LABELS[amenity] ?? amenity}
                            </span>
                        ))}
                    </div>
                </div>
            )}

            {/* Inquiries */}
            <div className="mt-8">
                <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                    Inquiries {inquiries && inquiries.length > 0 ? `(${inquiries.length})` : ""}
                </h2>
                {inquiries && inquiries.length > 0 ? (
                    <div className="mt-4 space-y-3">
                        {inquiries.map((inq) => {
                            const tenant = inq.profiles as { full_name: string } | null;
                            return (
                                <div key={inq.id} className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-700">
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
                                            {tenant?.full_name ?? "Unknown tenant"}
                                        </span>
                                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${inq.status === "pending" ? "bg-amber-100 text-amber-700" :
                                            inq.status === "responded" ? "bg-green-100 text-green-700" :
                                                "bg-zinc-100 text-zinc-500"
                                            }`}>
                                            {inq.status}
                                        </span>
                                    </div>
                                    <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">{inq.message}</p>
                                    <p className="mt-1 text-xs text-zinc-400">
                                        {new Date(inq.created_at).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" })}
                                    </p>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <p className="mt-4 text-sm text-zinc-500 dark:text-zinc-400">No inquiries yet.</p>
                )}
            </div>
        </div>
    );
}
