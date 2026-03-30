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
        <div className="mx-auto w-full max-w-4xl px-4 py-8">
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">Inquiries</h1>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                Messages from interested tenants
            </p>

            {inquiries && inquiries.length > 0 ? (
                <div className="mt-8 space-y-4">
                    {inquiries.map((inq) => {
                        const tenant = inq.profiles;
                        const apt = apartmentMap.get(inq.apartment_id);

                        return (
                            <div key={inq.id} className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-700 dark:bg-zinc-800">
                                <div className="flex items-start justify-between">
                                    <div>
                                        <p className="font-medium text-zinc-900 dark:text-zinc-50">
                                            {tenant?.full_name ?? "Unknown tenant"}
                                        </p>
                                        {apt && (
                                            <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">
                                                Re: {apt.title} — {APARTMENT_TYPE_LABELS[apt.apartment_type as keyof typeof APARTMENT_TYPE_LABELS]}, {apt.neighborhood}, {CITY_LABELS[apt.city as keyof typeof CITY_LABELS]} ({formatNaira(apt.annual_rent)}/yr)
                                            </p>
                                        )}
                                    </div>
                                    <span className={`rounded-full px-2 py-1 text-xs font-medium ${inq.status === "pending" ? "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-400" :
                                        inq.status === "responded" ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-400" :
                                            "bg-zinc-100 text-zinc-500 dark:bg-zinc-700 dark:text-zinc-400"
                                        }`}>
                                        {inq.status}
                                    </span>
                                </div>
                                <p className="mt-3 text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">{inq.message}</p>
                                <div className="mt-3 flex items-center justify-between">
                                    <p className="text-xs text-zinc-400">
                                        {new Date(inq.created_at).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                                    </p>
                                    {tenant?.phone && (
                                        <a
                                            href={`https://wa.me/${tenant.phone.replace(/\D/g, "")}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center gap-1 rounded-lg bg-green-50 px-3 py-1.5 text-xs font-medium text-green-700 hover:bg-green-100 dark:bg-green-950 dark:text-green-400"
                                        >
                                            Reply on WhatsApp
                                        </a>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            ) : (
                <div className="mt-20 text-center">
                    <p className="text-zinc-500 dark:text-zinc-400">No inquiries yet. They&apos;ll appear here when tenants express interest.</p>
                </div>
            )}
        </div>
    );
}
