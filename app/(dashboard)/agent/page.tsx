import { createSupabaseServer } from "@/app/lib/supabase/server";
import { redirect } from "next/navigation";

type LandlordRow = {
    id: string;
    full_name: string;
    phone: string | null;
    created_at: string;
};

type AgentRow = {
    id: string;
    agent_code: string;
    name: string;
};

export default async function AgentDashboardPage(): Promise<React.ReactElement> {
    const supabase = await createSupabaseServer();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        redirect("/agent/login");
    }

    // Fetch this agent's record
    const { data: agentRow } = await supabase
        .from("agents")
        .select("id, agent_code, name")
        .eq("user_id", user.id)
        .maybeSingle()
        .overrideTypes<AgentRow, { merge: false }>();

    if (!agentRow) {
        return (
            <div className="text-center py-20 text-[#6a5e54] dark:text-zinc-400">
                Agent record not found. Please contact support.
            </div>
        );
    }

    // Fetch landlords belonging to this agent
    const { data: landlords } = await supabase
        .from("profiles")
        .select("id, full_name, phone, created_at")
        .eq("agent_id", agentRow.id)
        .eq("role", "landlord")
        .order("created_at", { ascending: false })
        .overrideTypes<LandlordRow[], { merge: false }>();

    const landlordList = landlords ?? [];

    return (
        <div className="max-w-4xl mx-auto space-y-10">
            {/* Agent code card */}
            <div className="bg-[#f8efe7] dark:bg-zinc-900 rounded-[2rem] p-8 ambient-shadow">
                <p className="font-mono text-xs uppercase tracking-[0.2em] text-[#6a5e54] dark:text-zinc-400 mb-2">
                    Your Agent Code
                </p>
                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                    <span className="font-(family-name:--font-geist-mono) text-3xl font-bold text-[#7b5d43] dark:text-amber-400 tracking-widest">
                        {agentRow.agent_code}
                    </span>
                    <p className="text-sm text-[#6a5e54] dark:text-zinc-400">
                        Share this code with landlords so they can register under you.
                    </p>
                </div>
            </div>

            {/* Landlords list */}
            <div>
                <div className="flex items-center justify-between mb-6">
                    <h2 className="font-(family-name:--font-manrope) text-xl font-bold text-[#2a221d] dark:text-zinc-50">
                        My Landlords
                    </h2>
                    <span className="font-mono text-xs uppercase tracking-[0.2em] text-zinc-400">
                        {landlordList.length} total
                    </span>
                </div>

                {landlordList.length === 0 ? (
                    <div className="bg-[#f8efe7] dark:bg-zinc-900 rounded-[2rem] p-12 ambient-shadow text-center space-y-3">
                        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#f3ddc8] dark:bg-amber-900">
                            <span className="text-2xl">👥</span>
                        </div>
                        <p className="font-bold text-[#2a221d] dark:text-zinc-50">No landlords yet</p>
                        <p className="text-sm text-[#6a5e54] dark:text-zinc-400">
                            Share your agent code{" "}
                            <span className="font-mono font-bold text-[#7b5d43] dark:text-amber-400">
                                {agentRow.agent_code}
                            </span>{" "}
                            with landlords when they register.
                        </p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {landlordList.map((landlord) => {
                            const joinDate = new Date(landlord.created_at).toLocaleDateString("en-NG", {
                                year: "numeric",
                                month: "short",
                                day: "numeric",
                            });
                            return (
                                <div
                                    key={landlord.id}
                                    className="bg-[#f8efe7] dark:bg-zinc-900 rounded-2xl p-6 ambient-shadow flex items-center justify-between gap-4"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#d78f45] text-sm font-bold text-white">
                                            {landlord.full_name[0]?.toUpperCase() ?? "L"}
                                        </div>
                                        <div>
                                            <p className="font-bold text-[#2a221d] dark:text-zinc-50 text-sm">
                                                {landlord.full_name}
                                            </p>
                                            {landlord.phone && (
                                                <p className="text-xs text-[#6a5e54] dark:text-zinc-400 mt-0.5">
                                                    {landlord.phone}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                    <div className="text-right shrink-0">
                                        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-zinc-400">
                                            Joined
                                        </p>
                                        <p className="text-xs text-[#6a5e54] dark:text-zinc-400 mt-0.5">
                                            {joinDate}
                                        </p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
