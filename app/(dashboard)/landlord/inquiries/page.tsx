import { createSupabaseServer } from "@/app/lib/supabase/server";
import { APARTMENT_TYPE_LABELS, CITY_LABELS } from "@/app/lib/data/neighborhoods";
import { formatNaira } from "@/app/lib/ai/affordability";

export default async function InquiriesPage(): Promise<React.ReactElement> {
    const supabase = await createSupabaseServer();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    // Get all apartments by this landlord
    const { data: apartments } = await supabase
        .from("apartments")
        .select("id, title, city, neighborhood, apartment_type, annual_rent")
        .eq("landlord_id", user!.id)
        .returns<Array<{ id: string; title: string; city: string; neighborhood: string; apartment_type: string; annual_rent: number }>>();

    const apartmentIds = apartments?.map((a) => a.id) ?? [];

    type InquiryWithTenant = {
        id: string;
        apartment_id: string;
        message: string;
        status: string;
        created_at: string;
        profiles: { full_name: string; phone: string | null } | null;
    };

    // Get all inquiries for these apartments
    const { data: inquiries } = apartmentIds.length > 0
        ? await supabase
            .from("inquiries")
            .select("*, profiles!inquiries_tenant_id_fkey(full_name, phone)")
            .in("apartment_id", apartmentIds)
            .order("created_at", { ascending: false })
            .overrideTypes<InquiryWithTenant[]>()
        : { data: [] as InquiryWithTenant[] };

    const apartmentMap = new Map(apartments?.map((a) => [a.id, a]) ?? []);

    return (
        <div className="mx-auto w-full max-w-6xl">
            {/* Header */}
            <div className="mb-12">
                <h1 className="font-[family-name:var(--font-geist-sans)] text-4xl font-black tracking-tight text-[#1a1b22] dark:text-zinc-50 mb-2">Inquiries</h1>
                <p className="text-zinc-500 dark:text-zinc-400 max-w-lg">Manage your property inquiries and tenant communication through Victoria&apos;s curated workspace.</p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
                <div className="bg-[#f4f2fd] dark:bg-zinc-900 p-6 rounded-3xl relative overflow-hidden group">
                    <p className="text-[10px] uppercase font-bold tracking-[0.3em] text-zinc-500 mb-2">Pending</p>
                    <h3 className="font-[family-name:var(--font-geist-sans)] text-3xl font-black text-[#1a1b22] dark:text-zinc-50">
                        {inquiries?.filter((i) => i.status === "pending").length ?? 0}
                    </h3>
                </div>
                <div className="bg-[#f4f2fd] dark:bg-zinc-900 p-6 rounded-3xl relative overflow-hidden group">
                    <p className="text-[10px] uppercase font-bold tracking-[0.3em] text-zinc-500 mb-2">Responded</p>
                    <h3 className="font-[family-name:var(--font-geist-sans)] text-3xl font-black text-[#1a1b22] dark:text-zinc-50">
                        {inquiries?.filter((i) => i.status === "responded").length ?? 0}
                    </h3>
                </div>
                <div className="bg-[#f4f2fd] dark:bg-zinc-900 p-6 rounded-3xl relative overflow-hidden group">
                    <p className="text-[10px] uppercase font-bold tracking-[0.3em] text-zinc-500 mb-2">Total</p>
                    <h3 className="font-[family-name:var(--font-geist-sans)] text-3xl font-black text-[#1a1b22] dark:text-zinc-50">
                        {inquiries?.length ?? 0}
                    </h3>
                </div>
            </div>

            {inquiries && inquiries.length > 0 ? (
                <div className="bg-white dark:bg-zinc-900 rounded-3xl ambient-shadow overflow-hidden">
                    <div className="p-6 flex items-center justify-between bg-[#f4f2fd]/50 dark:bg-zinc-800/50">
                        <span className="font-[family-name:var(--font-geist-mono)] text-[10px] text-zinc-400 uppercase tracking-[0.3em]">
                            Showing {inquiries.length} inquir{inquiries.length !== 1 ? "ies" : "y"}
                        </span>
                    </div>
                    <div className="divide-y divide-zinc-50 dark:divide-zinc-800">
                        {inquiries.map((inq) => {
                            const tenant = inq.profiles;
                            const apt = apartmentMap.get(inq.apartment_id);

                            return (
                                <div key={inq.id} className="p-6 hover:bg-zinc-50/50 dark:hover:bg-zinc-800/50 transition-colors">
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="flex items-start gap-4">
                                            <div className="w-10 h-10 rounded-full bg-[#e8e7f1] dark:bg-zinc-800 flex items-center justify-center text-sm font-bold text-[#006b2c]">
                                                {(tenant?.full_name ?? "?")[0].toUpperCase()}
                                            </div>
                                            <div>
                                                <p className="font-bold text-[#1a1b22] dark:text-zinc-50">
                                                    {tenant?.full_name ?? "Unknown tenant"}
                                                </p>
                                                {apt && (
                                                    <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">
                                                        Re: <span className="text-[#006b2c] dark:text-emerald-400 font-semibold">{apt.title}</span> — {APARTMENT_TYPE_LABELS[apt.apartment_type as keyof typeof APARTMENT_TYPE_LABELS]}, {apt.neighborhood}, {CITY_LABELS[apt.city as keyof typeof CITY_LABELS]} ({formatNaira(apt.annual_rent)}/yr)
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <span className="font-[family-name:var(--font-geist-mono)] text-[10px] text-zinc-400">
                                                {new Date(inq.created_at).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" })}
                                            </span>
                                            <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${inq.status === "pending"
                                                ? "bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400"
                                                : inq.status === "responded"
                                                    ? "bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400"
                                                    : "bg-zinc-100 dark:bg-zinc-800 text-zinc-500"
                                                }`}>
                                                {inq.status}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="mt-4 ml-14">
                                        <p className="text-sm leading-relaxed text-[#3e4a3d] dark:text-zinc-300">{inq.message}</p>
                                        {tenant?.phone && (
                                            <a
                                                href={`https://wa.me/${tenant.phone.replace(/\D/g, "")}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="inline-flex items-center gap-2 mt-4 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 px-4 py-2 rounded-xl text-xs font-bold hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition-colors"
                                            >
                                                💬 Reply on WhatsApp
                                            </a>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            ) : (
                <div className="mt-12 py-20 bg-[#f4f2fd] dark:bg-zinc-900 rounded-[2rem] flex flex-col items-center justify-center text-center px-6">
                    <div className="w-20 h-20 bg-zinc-100 dark:bg-zinc-800 rounded-full flex items-center justify-center mb-6">
                        <span className="text-4xl">📬</span>
                    </div>
                    <p className="text-zinc-500 dark:text-zinc-400">No inquiries yet. They&apos;ll appear here when tenants express interest.</p>
                </div>
            )}
        </div>
    );
}
