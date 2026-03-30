import { createSupabaseServer } from "@/app/lib/supabase/server";
import Link from "next/link";
import { APARTMENT_TYPE_LABELS, CITY_LABELS } from "@/app/lib/data/neighborhoods";
import { formatNaira } from "@/app/lib/ai/affordability";

export default async function LandlordDashboard(): Promise<React.ReactElement> {
    const supabase = await createSupabaseServer();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    type LandlordListingRow = {
        id: string;
        title: string;
        apartment_type: string;
        annual_rent: number;
        city: string;
        neighborhood: string;
        is_available: boolean;
        is_verified: boolean;
        created_at: string;
        apartment_images: Array<{ image_url: string; is_primary: boolean }>;
    };

    const { data: apartments } = await supabase
        .from("apartments")
        .select(`
      id, title, apartment_type, annual_rent, city, neighborhood,
      is_available, is_verified, created_at,
      apartment_images(image_url, is_primary)
    `)
        .eq("landlord_id", user!.id)
        .order("created_at", { ascending: false })
        .overrideTypes<LandlordListingRow[]>();

    const { count: inquiryCount } = await supabase
        .from("inquiries")
        .select("id", { count: "exact", head: true })
        .eq("status", "pending")
        .in(
            "apartment_id",
            (apartments ?? []).map((a) => a.id),
        );

    return (
        <div className="mx-auto w-full max-w-7xl px-4 py-8">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">My Listings</h1>
                    <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                        {apartments?.length ?? 0} listing{(apartments?.length ?? 0) !== 1 ? "s" : ""}
                        {inquiryCount ? ` · ${inquiryCount} pending inquir${inquiryCount !== 1 ? "ies" : "y"}` : ""}
                    </p>
                </div>
                <Link
                    href="/landlord/listings/new"
                    className="rounded-lg bg-green-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-green-700"
                >
                    + New Listing
                </Link>
            </div>

            {apartments && apartments.length > 0 ? (
                <div className="mt-8 space-y-4">
                    {apartments.map((apt) => {
                        const primaryImage = apt.apartment_images?.find((img) => img.is_primary)?.image_url;

                        return (
                            <Link
                                key={apt.id}
                                href={`/landlord/listings/${apt.id}`}
                                className="flex items-center gap-4 rounded-xl border border-zinc-200 bg-white p-4 transition-shadow hover:shadow-md dark:border-zinc-700 dark:bg-zinc-800"
                            >
                                <div className="h-20 w-28 flex-shrink-0 overflow-hidden rounded-lg bg-zinc-100 dark:bg-zinc-700">
                                    {primaryImage ? (
                                        <img src={primaryImage} alt={apt.title} className="h-full w-full object-cover" />
                                    ) : (
                                        <div className="flex h-full items-center justify-center text-xs text-zinc-400">No image</div>
                                    )}
                                </div>
                                <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                        <h3 className="font-semibold text-zinc-900 dark:text-zinc-50">{apt.title}</h3>
                                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${apt.is_available
                                            ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-400"
                                            : "bg-zinc-100 text-zinc-500 dark:bg-zinc-700 dark:text-zinc-400"
                                            }`}>
                                            {apt.is_available ? "Available" : "Unavailable"}
                                        </span>
                                        {apt.is_verified && (
                                            <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-medium text-blue-700 dark:bg-blue-900 dark:text-blue-400">
                                                Verified
                                            </span>
                                        )}
                                    </div>
                                    <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">
                                        {APARTMENT_TYPE_LABELS[apt.apartment_type as keyof typeof APARTMENT_TYPE_LABELS]} · {apt.neighborhood}, {CITY_LABELS[apt.city as keyof typeof CITY_LABELS]}
                                    </p>
                                </div>
                                <div className="text-right">
                                    <p className="text-lg font-bold text-green-600">{formatNaira(apt.annual_rent)}</p>
                                    <p className="text-xs text-zinc-400">per year</p>
                                </div>
                            </Link>
                        );
                    })}
                </div>
            ) : (
                <div className="mt-20 text-center">
                    <p className="text-zinc-500 dark:text-zinc-400">You haven&apos;t listed any apartments yet.</p>
                    <Link
                        href="/landlord/listings/new"
                        className="mt-4 inline-block rounded-lg bg-green-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-green-700"
                    >
                        Create your first listing
                    </Link>
                </div>
            )}
        </div>
    );
}
