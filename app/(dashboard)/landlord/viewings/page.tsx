import { createSupabaseServer } from "@/app/lib/supabase/server";
import { redirect } from "next/navigation";
import type { ViewingRequest } from "@/app/lib/types";
import { ViewingRequestActions } from "@/app/components/viewing/viewing-request-actions";

type ViewingRow = ViewingRequest & {
    apartments: {
        id: string;
        title: string;
        neighborhood: string;
        city: string;
        ppid: string;
    } | null;
    profiles: {
        full_name: string;
        phone: string | null;
    } | null;
};

const STATUS_LABELS: Record<string, string> = {
    pending: "Pending",
    confirmed: "Confirmed",
    declined: "Declined",
    cancelled: "Cancelled",
};

const STATUS_COLORS: Record<string, string> = {
    pending: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
    confirmed: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
    declined: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
    cancelled: "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400",
};

const TIME_LABELS: Record<string, string> = {
    morning: "Morning (8am – 12pm)",
    afternoon: "Afternoon (12pm – 4pm)",
    evening: "Evening (4pm – 7pm)",
};

export default async function LandlordViewingsPage(): Promise<React.ReactElement> {
    const supabase = await createSupabaseServer();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) redirect("/login");

    // Fetch all viewing requests for apartments owned by this landlord
    const { data: requests } = await supabase
        .from("viewing_requests")
        .select("*, apartments!inner(id, title, neighborhood, city, ppid), profiles(full_name, phone)")
        .eq("apartments.landlord_id", user.id)
        .order("created_at", { ascending: false })
        .overrideTypes<ViewingRow[]>();

    const rows = requests ?? [];

    const pending = rows.filter((r) => r.status === "pending");
    const others = rows.filter((r) => r.status !== "pending");

    function Card({ req }: { req: ViewingRow }): React.ReactElement {
        return (
            <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div>
                        <p className="font-semibold text-zinc-900 dark:text-zinc-50">
                            {req.apartments?.title ?? "Apartment"}
                        </p>
                        {req.apartments && (
                            <p className="text-xs font-mono uppercase tracking-[0.15em] text-zinc-400 mt-0.5">
                                {req.apartments.ppid}
                            </p>
                        )}
                        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
                            {req.apartments?.neighborhood}, {req.apartments?.city}
                        </p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold shrink-0 ${STATUS_COLORS[req.status] ?? ""}`}>
                        {STATUS_LABELS[req.status] ?? req.status}
                    </span>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                    <div>
                        <p className="text-xs font-mono uppercase tracking-[0.15em] text-zinc-400">Tenant</p>
                        <p className="mt-0.5 text-zinc-700 dark:text-zinc-300">
                            {req.profiles?.full_name ?? "Unknown"}
                        </p>
                        {req.profiles?.phone && (
                            <p className="text-xs text-zinc-500">{req.profiles.phone}</p>
                        )}
                    </div>
                    <div>
                        <p className="text-xs font-mono uppercase tracking-[0.15em] text-zinc-400">Preferred slot</p>
                        <p className="mt-0.5 text-zinc-700 dark:text-zinc-300">
                            {new Date(req.preferred_date).toLocaleDateString("en-NG", {
                                weekday: "short",
                                year: "numeric",
                                month: "short",
                                day: "numeric",
                            })}
                        </p>
                        <p className="text-xs text-zinc-500">{TIME_LABELS[req.preferred_time] ?? req.preferred_time}</p>
                    </div>
                </div>

                {req.message && (
                    <div className="mt-3">
                        <p className="text-xs font-mono uppercase tracking-[0.15em] text-zinc-400">Tenant&apos;s note</p>
                        <p className="mt-0.5 text-sm text-zinc-700 dark:text-zinc-300">{req.message}</p>
                    </div>
                )}

                {req.landlord_note && (
                    <div className="mt-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 px-4 py-3">
                        <p className="text-xs font-mono uppercase tracking-[0.15em] text-amber-700 dark:text-amber-400">
                            Your note
                        </p>
                        <p className="mt-0.5 text-sm text-amber-900 dark:text-amber-200">{req.landlord_note}</p>
                    </div>
                )}

                <ViewingRequestActions
                    requestId={req.id}
                    currentStatus={req.status}
                />

                <p className="mt-4 text-xs text-zinc-400">
                    Requested{" "}
                    {new Date(req.created_at).toLocaleDateString("en-NG", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                    })}
                </p>
            </div>
        );
    }

    return (
        <div className="max-w-3xl mx-auto">
            <div className="mb-8">
                <h1 className="font-(family-name:--font-geist-sans) text-2xl font-bold text-zinc-900 dark:text-zinc-50">
                    Viewing Requests
                </h1>
                <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                    Tenants requesting to view your apartments.
                </p>
            </div>

            {rows.length === 0 ? (
                <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-12 text-center">
                    <p className="text-4xl mb-3">📅</p>
                    <p className="font-semibold text-zinc-900 dark:text-zinc-50">No viewing requests yet</p>
                    <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                        When tenants request viewings of your listings, they will appear here.
                    </p>
                </div>
            ) : (
                <div className="flex flex-col gap-8">
                    {pending.length > 0 && (
                        <section>
                            <h2 className="font-(family-name:--font-geist-sans) text-sm font-semibold uppercase tracking-[0.15em] text-zinc-400 mb-4">
                                Awaiting response ({pending.length})
                            </h2>
                            <div className="flex flex-col gap-4">
                                {pending.map((req) => (
                                    <Card key={req.id} req={req} />
                                ))}
                            </div>
                        </section>
                    )}

                    {others.length > 0 && (
                        <section>
                            <h2 className="font-(family-name:--font-geist-sans) text-sm font-semibold uppercase tracking-[0.15em] text-zinc-400 mb-4">
                                Past requests
                            </h2>
                            <div className="flex flex-col gap-4">
                                {others.map((req) => (
                                    <Card key={req.id} req={req} />
                                ))}
                            </div>
                        </section>
                    )}
                </div>
            )}
        </div>
    );
}
