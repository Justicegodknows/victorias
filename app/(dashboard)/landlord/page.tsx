import { createSupabaseServer } from "@/app/lib/supabase/server";
import Link from "next/link";
import { APARTMENT_TYPE_LABELS, CITY_LABELS } from "@/app/lib/data/neighborhoods";
import { formatNaira } from "@/app/lib/ai/affordability";
import type { City } from "@/app/lib/types";
import { RpiBadge } from "@/app/components/rpi/rpi-badge";
import type { RpiBadgeData } from "@/app/components/rpi/rpi-badge";

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
        lga: string;
        neighborhood: string;
        is_available: boolean;
        is_verified: boolean;
        created_at: string;
        apartment_images: Array<{ image_url: string; is_primary: boolean }>;
    };

    const { data: apartments } = await supabase
        .from("apartments")
        .select(`
                        id, ppid, title, apartment_type, annual_rent, city, lga, neighborhood,
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

    const marketRows = [...rpiByLga.values()].slice(0, 4);

    return (
        <div className="mx-auto w-full max-w-6xl">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-12">
                <div>
                    <h1 className="font-(family-name:--font-geist-sans) text-4xl md:text-5xl font-black tracking-tighter text-[#2a221d] dark:text-zinc-50 mb-3">My Listings</h1>
                    <div className="flex gap-6 items-center">
                        <div className="flex flex-col">
                            <span className="font-mono text-[10px] text-zinc-400 uppercase tracking-[0.3em]">Total Properties</span>
                            <span className="font-(family-name:--font-geist-sans) text-2xl font-bold text-[#7b5d43] dark:text-amber-400">{apartments?.length ?? 0}</span>
                        </div>
                        <div className="w-px h-8 bg-zinc-200 dark:bg-zinc-700" />
                        <div className="flex flex-col">
                            <span className="font-mono text-[10px] text-zinc-400 uppercase tracking-[0.3em]">Active Inquiries</span>
                            <span className="font-(family-name:--font-geist-sans) text-2xl font-bold text-[#7b5d43] dark:text-amber-400">{inquiryCount ?? 0}</span>
                        </div>
                    </div>
                </div>
                <Link
                    href="/landlord/listings/new"
                    className="btn-primary-gradient text-white px-8 py-4 rounded-xl font-(family-name:--font-geist-sans) font-bold text-lg shadow-[0px_10px_20px_rgba(0,107,44,0.2)] hover:scale-[1.02] active:scale-95 transition-all flex items-center gap-3"
                >
                    ➕ New Listing
                </Link>
            </div>

            {marketRows.length > 0 && (
                <div className="mb-8 rounded-2xl border border-amber-100 bg-amber-50/60 p-5 dark:border-amber-900/40 dark:bg-amber-950/30">
                    <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-amber-700 dark:text-amber-400">Rental Price Index</p>
                    <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                        {marketRows.map((row) => {
                            const trendColor =
                                row.trend === "up"
                                    ? "text-red-500"
                                    : row.trend === "down"
                                        ? "text-amber-600 dark:text-amber-400"
                                        : "text-zinc-400";
                            const arrow =
                                row.trend === "up" ? "↑" : row.trend === "down" ? "↓" : "—";
                            return (
                                <div key={`${row.city}:${row.lga}`} className="rounded-xl bg-white/80 px-3 py-2 dark:bg-zinc-900/60">
                                    <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-zinc-500">{row.lga}</p>
                                    <p className="mt-1 text-lg font-black text-amber-700 dark:text-amber-300">{formatNaira(Math.round(row.rpi_value))}</p>
                                    <div className="flex items-center gap-2 mt-0.5">
                                        <p className="text-[10px] text-zinc-500">{String(row.month).padStart(2, "0")}/{row.year}</p>
                                        {row.trend !== "stable" && (
                                            <span className={`text-[10px] font-bold ${trendColor}`}>
                                                {arrow} {Math.abs(row.trend_percent).toFixed(1)}%
                                            </span>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {apartments && apartments.length > 0 ? (
                <div className="space-y-6">
                    {apartments.map((apt) => {
                        const primaryImage = apt.apartment_images?.find((img) => img.is_primary)?.image_url;
                        const areaRpi = rpiByLga.get(`${apt.city}:${apt.lga}`);

                        return (
                            <Link
                                key={apt.id}
                                href={`/landlord/listings/${apt.id}`}
                                className="group bg-[#f8efe7] dark:bg-zinc-900 rounded-2xl p-4 flex flex-col md:flex-row gap-6 hover:bg-[#efe0d2] dark:hover:bg-zinc-800 transition-all duration-300 ambient-shadow"
                            >
                                <div className="relative w-full md:w-64 h-48 rounded-xl overflow-hidden shrink-0">
                                    {primaryImage ? (
                                        <img src={primaryImage} alt={apt.title} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                                    ) : (
                                        <div className="w-full h-full bg-linear-to-br from-amber-100 to-amber-50 dark:from-zinc-800 dark:to-zinc-900 flex items-center justify-center">
                                            <span className="text-4xl">🏠</span>
                                        </div>
                                    )}
                                    {apt.is_verified && (
                                        <div className="absolute top-3 left-3">
                                            <span className="bg-[#7b5d43]/90 text-white text-[10px] px-3 py-1 rounded-full font-mono uppercase tracking-wider backdrop-blur-md">
                                                ✅ Verified
                                            </span>
                                        </div>
                                    )}
                                </div>
                                <div className="flex-1 flex flex-col justify-between py-2">
                                    <div>
                                        <div className="flex items-center gap-2 mb-2">
                                            <span className="bg-[#f3ddc8] dark:bg-amber-900 text-[#406c46] dark:text-amber-400 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-widest">
                                                {APARTMENT_TYPE_LABELS[apt.apartment_type as keyof typeof APARTMENT_TYPE_LABELS]}
                                            </span>
                                        </div>
                                        <h3 className="text-xl md:text-2xl font-bold tracking-tight text-[#2a221d] dark:text-zinc-50 mb-1">{apt.title}</h3>
                                        <p className="mb-1 text-[10px] font-mono uppercase tracking-[0.2em] text-zinc-400">{apt.ppid}</p>
                                        <p className="text-zinc-500 flex items-center gap-1">
                                            📍 {apt.neighborhood}, {CITY_LABELS[apt.city as keyof typeof CITY_LABELS]}
                                        </p>
                                        {areaRpi && (
                                            <div className="mt-2">
                                                <RpiBadge data={areaRpi} />
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div className="md:w-48 flex flex-col items-end justify-between py-2 text-right">
                                    <div>
                                        <p className="text-[10px] text-zinc-400 font-mono uppercase tracking-[0.3em] mb-1">Annual Rent</p>
                                        <p className="text-2xl md:text-3xl font-black text-[#7b5d43] dark:text-amber-400 font-mono tracking-tighter">{formatNaira(apt.annual_rent)}</p>
                                    </div>
                                    <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${apt.is_available ? "bg-amber-50 dark:bg-amber-900/30" : "bg-zinc-100 dark:bg-zinc-800"}`}>
                                        <span className={`w-2 h-2 rounded-full ${apt.is_available ? "bg-amber-500 animate-pulse" : "bg-zinc-400"}`} />
                                        <span className={`text-[10px] font-bold uppercase tracking-widest ${apt.is_available ? "text-amber-800 dark:text-amber-400" : "text-zinc-500"}`}>
                                            {apt.is_available ? "Available" : "Unavailable"}
                                        </span>
                                    </div>
                                </div>
                            </Link>
                        );
                    })}
                </div>
            ) : (
                <div className="mt-12 py-20 bg-[#f8efe7] dark:bg-zinc-900 rounded-[2rem] border-2 border-dashed border-zinc-200 dark:border-zinc-700 flex flex-col items-center justify-center text-center px-6">
                    <div className="w-24 h-24 bg-zinc-100 dark:bg-zinc-800 rounded-full flex items-center justify-center mb-6">
                        <span className="text-5xl">🏘️</span>
                    </div>
                    <h2 className="font-(family-name:--font-geist-sans) text-3xl font-bold tracking-tight text-[#2a221d] dark:text-zinc-50 mb-2">No listings yet</h2>
                    <p className="text-zinc-500 max-w-md mb-8">Start your journey as a premier landlord. Create your first property listing and let our AI concierge handle the inquiries.</p>
                    <Link href="/landlord/listings/new" className="bg-[#7b5d43] text-white px-8 py-3 rounded-full font-(family-name:--font-geist-sans) font-bold flex items-center gap-2 hover:opacity-90 transition-opacity">
                        ➕ Create first listing
                    </Link>
                </div>
            )}
        </div>
    );
}
