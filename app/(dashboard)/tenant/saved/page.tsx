import { createSupabaseServer } from "@/app/lib/supabase/server";
import Link from "next/link";
import { APARTMENT_TYPE_LABELS, CITY_LABELS } from "@/app/lib/data/neighborhoods";
import { formatNaira } from "@/app/lib/ai/affordability";

export default async function SavedApartmentsPage(): Promise<React.ReactElement> {
    const supabase = await createSupabaseServer();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    type SavedRow = {
        apartment_id: string;
        apartments: {
            id: string;
            title: string;
            apartment_type: string;
            annual_rent: number;
            total_upfront_cost: number;
            city: string;
            neighborhood: string;
            apartment_images: Array<{ image_url: string; is_primary: boolean }>;
        } | null;
    };

    const { data: saved } = await supabase
        .from("saved_apartments")
        .select(`
      apartment_id,
      apartments(
        id, title, apartment_type, annual_rent, total_upfront_cost,
        city, neighborhood,
        apartment_images(image_url, is_primary)
      )
    `)
        .eq("tenant_id", user!.id)
        .order("created_at", { ascending: false })
        .overrideTypes<SavedRow[]>();

    const apartments = saved?.map((s) => s.apartments).filter(Boolean) ?? [];

    return (
        <div className="mx-auto w-full max-w-7xl px-4 py-8">
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">Saved Apartments</h1>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                Apartments you&apos;ve bookmarked for later
            </p>

            {apartments.length > 0 ? (
                <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                    {apartments.map((apt) => {
                        const primaryImage = apt.apartment_images?.find((img) => img.is_primary)?.image_url;

                        return (
                            <Link
                                key={apt.id}
                                href={`/tenant/apartments/${apt.id}`}
                                className="group overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm transition-shadow hover:shadow-md dark:border-zinc-700 dark:bg-zinc-800"
                            >
                                <div className="flex h-40 items-center justify-center bg-zinc-100 dark:bg-zinc-700">
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
                                    <p className="mt-2 text-lg font-bold text-green-600">
                                        {formatNaira(apt.annual_rent)}<span className="text-xs font-normal">/yr</span>
                                    </p>
                                </div>
                            </Link>
                        );
                    })}
                </div>
            ) : (
                <div className="mt-20 text-center">
                    <p className="text-zinc-500 dark:text-zinc-400">You haven&apos;t saved any apartments yet.</p>
                    <div className="mt-4 flex justify-center gap-3">
                        <Link href="/tenant/browse" className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900">
                            Browse apartments
                        </Link>
                        <Link href="/tenant" className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700">
                            Ask Victoria AI
                        </Link>
                    </div>
                </div>
            )}
        </div>
    );
}
