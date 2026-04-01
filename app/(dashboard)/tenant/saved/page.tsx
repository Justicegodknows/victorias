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

    const apartments = saved?.map((s) => s.apartments).filter((apt): apt is NonNullable<typeof apt> => apt !== null) ?? [];

    return (
        <div className="mx-auto w-full max-w-6xl">
            <div className="mb-10">
                <span className="font-[family-name:var(--font-geist-mono)] text-[#006b2c] dark:text-emerald-400 uppercase tracking-[0.3em] font-bold text-[10px]">
                    Your Collection
                </span>
                <h1 className="font-[family-name:var(--font-manrope)] text-3xl font-bold text-[#1a1b22] dark:text-zinc-50 mt-2">Saved Apartments</h1>
                <p className="mt-2 text-sm text-[#3e4a3d] dark:text-zinc-400">
                    {apartments.length} apartment{apartments.length !== 1 ? "s" : ""} bookmarked for later
                </p>
            </div>

            {apartments.length > 0 ? (
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                    {apartments.map((apt) => {
                        const primaryImage = apt.apartment_images?.find((img) => img.is_primary)?.image_url;

                        return (
                            <Link
                                key={apt.id}
                                href={`/tenant/apartments/${apt.id}`}
                                className="group bg-white dark:bg-zinc-900 rounded-3xl overflow-hidden ambient-shadow hover:shadow-xl transition-all"
                            >
                                <div className="relative h-44">
                                    {primaryImage ? (
                                        <img src={primaryImage} alt={apt.title} className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                    ) : (
                                        <div className="h-full bg-gradient-to-br from-emerald-100 to-emerald-50 dark:from-zinc-800 dark:to-zinc-900 flex items-center justify-center">
                                            <span className="text-4xl">🏠</span>
                                        </div>
                                    )}
                                    <div className="absolute top-3 left-3 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-sm text-[#006b2c] dark:text-emerald-400 text-[10px] font-bold px-2 py-1 rounded-full">
                                        ❤️ Saved
                                    </div>
                                </div>
                                <div className="p-5">
                                    <h3 className="font-[family-name:var(--font-geist-sans)] font-bold text-[#1a1b22] dark:text-zinc-50 group-hover:text-[#006b2c] dark:group-hover:text-emerald-400 transition-colors">
                                        {apt.title}
                                    </h3>
                                    <p className="mt-1 text-sm text-[#3e4a3d] dark:text-zinc-400">
                                        {APARTMENT_TYPE_LABELS[apt.apartment_type as keyof typeof APARTMENT_TYPE_LABELS]} · {apt.neighborhood}, {CITY_LABELS[apt.city as keyof typeof CITY_LABELS]}
                                    </p>
                                    <div className="mt-3 flex items-baseline justify-between">
                                        <span className="font-[family-name:var(--font-geist-mono)] text-lg font-black text-[#006b2c] dark:text-emerald-400">
                                            {formatNaira(apt.annual_rent)}<span className="text-xs font-normal text-zinc-400">/yr</span>
                                        </span>
                                        <span className="text-[10px] text-zinc-400">
                                            Total: {formatNaira(apt.total_upfront_cost)}
                                        </span>
                                    </div>
                                </div>
                            </Link>
                        );
                    })}
                </div>
            ) : (
                <div className="mt-20 text-center">
                    <div className="w-20 h-20 rounded-full bg-[#f4f2fd] dark:bg-zinc-900 flex items-center justify-center mx-auto mb-6">
                        <span className="text-4xl">❤️</span>
                    </div>
                    <p className="text-[#3e4a3d] dark:text-zinc-400 mb-6">You haven&apos;t saved any apartments yet.</p>
                    <div className="flex justify-center gap-3">
                        <Link href="/tenant/browse" className="bg-[#1a1b22] dark:bg-zinc-800 text-white px-6 py-3 rounded-xl text-sm font-bold hover:opacity-90 transition-opacity">
                            Browse apartments
                        </Link>
                        <Link href="/tenant" className="btn-primary-gradient text-white px-6 py-3 rounded-xl text-sm font-bold">
                            Ask Victoria AI
                        </Link>
                    </div>
                </div>
            )}
        </div>
    );
}
