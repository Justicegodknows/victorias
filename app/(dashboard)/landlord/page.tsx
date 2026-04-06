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
        ppid: string;
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
            id, ppid, title, apartment_type, annual_rent, city, neighborhood,
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
        <div className="mx-auto w-full max-w-6xl">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-12">
                <div>
                    <h1 className="font-[family-name:var(--font-geist-sans)] text-4xl md:text-5xl font-black tracking-tighter text-[#1a1b22] dark:text-zinc-50 mb-3">My Listings</h1>
                    <div className="flex gap-6 items-center">
                        <div className="flex flex-col">
                            <span className="font-[family-name:var(--font-geist-mono)] text-[10px] text-zinc-400 uppercase tracking-[0.3em]">Total Properties</span>
                            <span className="font-[family-name:var(--font-geist-sans)] text-2xl font-bold text-[#006b2c] dark:text-emerald-400">{apartments?.length ?? 0}</span>
                        </div>
                        <div className="w-px h-8 bg-zinc-200 dark:bg-zinc-700" />
                        <div className="flex flex-col">
                            <span className="font-[family-name:var(--font-geist-mono)] text-[10px] text-zinc-400 uppercase tracking-[0.3em]">Active Inquiries</span>
                            <span className="font-[family-name:var(--font-geist-sans)] text-2xl font-bold text-[#006b2c] dark:text-emerald-400">{inquiryCount ?? 0}</span>
                        </div>
                    </div>
                </div>
                <Link
                    href="/landlord/listings/new"
                    className="btn-primary-gradient text-white px-8 py-4 rounded-xl font-[family-name:var(--font-geist-sans)] font-bold text-lg shadow-[0px_10px_20px_rgba(0,107,44,0.2)] hover:scale-[1.02] active:scale-95 transition-all flex items-center gap-3"
                >
                    ➕ New Listing
                </Link>
            </div>

            {apartments && apartments.length > 0 ? (
                <div className="space-y-6">
                    {apartments.map((apt) => {
                        const primaryImage = apt.apartment_images?.find((img) => img.is_primary)?.image_url;

                        return (
                            <Link
                                key={apt.id}
                                href={`/landlord/listings/${apt.id}`}
                                className="group bg-[#f4f2fd] dark:bg-zinc-900 rounded-2xl p-4 flex flex-col md:flex-row gap-6 hover:bg-[#e3e1ec] dark:hover:bg-zinc-800 transition-all duration-300 ambient-shadow"
                            >
                                <div className="relative w-full md:w-64 h-48 rounded-xl overflow-hidden flex-shrink-0">
                                    {primaryImage ? (
                                        <img src={primaryImage} alt={apt.title} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                                    ) : (
                                        <div className="w-full h-full bg-gradient-to-br from-emerald-100 to-emerald-50 dark:from-zinc-800 dark:to-zinc-900 flex items-center justify-center">
                                            <span className="text-4xl">🏠</span>
                                        </div>
                                    )}
                                    {apt.is_verified && (
                                        <div className="absolute top-3 left-3">
                                            <span className="bg-[#006b2c]/90 text-white text-[10px] px-3 py-1 rounded-full font-[family-name:var(--font-geist-mono)] uppercase tracking-wider backdrop-blur-md">
                                                ✅ Verified
                                            </span>
                                        </div>
                                    )}
                                </div>
                                <div className="flex-1 flex flex-col justify-between py-2">
                                    <div>
                                        <div className="flex items-center gap-2 mb-2">
                                            <span className="bg-[#baecbc] dark:bg-emerald-900 text-[#406c46] dark:text-emerald-400 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-widest">
                                                {APARTMENT_TYPE_LABELS[apt.apartment_type as keyof typeof APARTMENT_TYPE_LABELS]}
                                            </span>
                                        </div>
                                        <h3 className="text-xl md:text-2xl font-bold tracking-tight text-[#1a1b22] dark:text-zinc-50 mb-1">{apt.title}</h3>
                                        <p className="mb-1 text-[10px] font-mono uppercase tracking-[0.2em] text-zinc-400">{apt.ppid}</p>
                                        <p className="text-zinc-500 flex items-center gap-1">
                                            📍 {apt.neighborhood}, {CITY_LABELS[apt.city as keyof typeof CITY_LABELS]}
                                        </p>
                                    </div>
                                </div>
                                <div className="md:w-48 flex flex-col items-end justify-between py-2 text-right">
                                    <div>
                                        <p className="text-[10px] text-zinc-400 font-[family-name:var(--font-geist-mono)] uppercase tracking-[0.3em] mb-1">Annual Rent</p>
                                        <p className="text-2xl md:text-3xl font-black text-[#006b2c] dark:text-emerald-400 font-[family-name:var(--font-geist-mono)] tracking-tighter">{formatNaira(apt.annual_rent)}</p>
                                    </div>
                                    <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${apt.is_available ? "bg-emerald-50 dark:bg-emerald-900/30" : "bg-zinc-100 dark:bg-zinc-800"}`}>
                                        <span className={`w-2 h-2 rounded-full ${apt.is_available ? "bg-emerald-500 animate-pulse" : "bg-zinc-400"}`} />
                                        <span className={`text-[10px] font-bold uppercase tracking-widest ${apt.is_available ? "text-emerald-800 dark:text-emerald-400" : "text-zinc-500"}`}>
                                            {apt.is_available ? "Available" : "Unavailable"}
                                        </span>
                                    </div>
                                </div>
                            </Link>
                        );
                    })}
                </div>
            ) : (
                <div className="mt-12 py-20 bg-[#f4f2fd] dark:bg-zinc-900 rounded-[2rem] border-2 border-dashed border-zinc-200 dark:border-zinc-700 flex flex-col items-center justify-center text-center px-6">
                    <div className="w-24 h-24 bg-zinc-100 dark:bg-zinc-800 rounded-full flex items-center justify-center mb-6">
                        <span className="text-5xl">🏘️</span>
                    </div>
                    <h2 className="font-[family-name:var(--font-geist-sans)] text-3xl font-bold tracking-tight text-[#1a1b22] dark:text-zinc-50 mb-2">No listings yet</h2>
                    <p className="text-zinc-500 max-w-md mb-8">Start your journey as a premier landlord. Create your first property listing and let our AI concierge handle the inquiries.</p>
                    <Link href="/landlord/listings/new" className="bg-[#006b2c] text-white px-8 py-3 rounded-full font-[family-name:var(--font-geist-sans)] font-bold flex items-center gap-2 hover:opacity-90 transition-opacity">
                        ➕ Create first listing
                    </Link>
                </div>
            )}
        </div>
    );
}
