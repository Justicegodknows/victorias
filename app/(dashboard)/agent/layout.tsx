import Link from "next/link";
import { createSupabaseServer } from "@/app/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function AgentDashboardLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>): Promise<React.ReactElement> {
    const supabase = await createSupabaseServer();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        redirect("/agent/login");
    }

    const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, role")
        .eq("id", user.id)
        .single()
        .overrideTypes<{ full_name: string; role: string }, { merge: false }>();

    if (profile?.role !== "agent") {
        redirect("/login");
    }

    const name = profile?.full_name ?? "Agent";
    const firstName = name.split(" ")[0];

    return (
        <div className="flex min-h-full flex-col">
            <nav className="sticky top-0 z-50 w-full glass-nav shadow-[0px_20px_40px_rgba(53,37,22,0.08)]">
                <div className="mx-auto flex h-20 w-full max-w-screen-2xl items-center justify-between px-8">
                    <div className="flex items-center gap-8">
                        <Link
                            href="/"
                            className="font-(family-name:--font-geist-sans) text-2xl font-black tracking-tighter text-amber-900 dark:text-amber-50"
                        >
                            Victoria&apos;s
                        </Link>
                        <div className="hidden items-center gap-6 font-(family-name:--font-geist-sans) font-semibold tracking-tight md:flex">
                            <Link
                                href="/agent"
                                className="text-zinc-500 transition-colors hover:text-amber-600 dark:text-zinc-400"
                            >
                                My Landlords
                            </Link>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-3 border-l border-zinc-200/50 pl-4 dark:border-zinc-700/50">
                            <div className="hidden text-right sm:block">
                                <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-zinc-400">Agent</p>
                                <p className="text-sm font-bold text-[#2a221d] dark:text-zinc-50">{name}</p>
                            </div>
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#3b6842] text-sm font-bold text-white">
                                {firstName[0]?.toUpperCase() ?? "A"}
                            </div>
                            <form action="/api/auth/signout" method="POST">
                                <button
                                    type="submit"
                                    className="ml-2 rounded-lg bg-zinc-100 px-4 py-2 text-sm font-semibold text-zinc-700 transition-transform hover:bg-zinc-200 active:scale-95 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
                                >
                                    Sign Out
                                </button>
                            </form>
                        </div>
                    </div>
                </div>
            </nav>

            <main className="flex min-h-[calc(100vh-5rem)]">
                <aside className="sticky top-20 hidden h-[calc(100vh-5rem)] w-64 shrink-0 flex-col gap-2 bg-zinc-50 px-4 py-8 md:flex dark:bg-zinc-950">
                    <div className="mb-6 px-4">
                        <p className="mb-4 font-mono text-[10px] uppercase tracking-[0.2em] text-zinc-400">
                            Agent Dashboard
                        </p>
                        <div className="space-y-1">
                            <Link
                                href="/agent"
                                className="flex items-center gap-3 rounded-lg px-4 py-2.5 text-zinc-500 transition-all hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-900"
                            >
                                <span>👥</span>
                                <span className="text-sm">My Landlords</span>
                            </Link>
                        </div>
                    </div>
                </aside>

                <section className="flex-1 overflow-y-auto p-4 pb-24 md:p-8 md:pb-8">
                    {children}
                </section>
            </main>

            {/* Mobile bottom nav */}
            <nav className="fixed bottom-0 z-50 w-full rounded-t-3xl bg-zinc-50/80 backdrop-blur-xl shadow-[0px_-10px_30px_rgba(0,0,0,0.05)] md:hidden dark:bg-zinc-950/80">
                <div className="flex h-20 items-center justify-around px-6">
                    <Link
                        href="/agent"
                        className="flex flex-col items-center justify-center px-4 py-1 text-zinc-400 dark:text-zinc-600"
                    >
                        <span>👥</span>
                        <span className="mt-1 font-mono text-[10px] uppercase tracking-[0.2em]">Landlords</span>
                    </Link>
                </div>
            </nav>
        </div>
    );
}
