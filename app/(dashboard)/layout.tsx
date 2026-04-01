import Link from "next/link";
import { createSupabaseServer } from "@/app/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function DashboardLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>): Promise<React.ReactElement> {
    const supabase = await createSupabaseServer();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        redirect("/login");
    }

    const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, role")
        .eq("id", user.id)
        .single()
        .overrideTypes<{ full_name: string; role: string }, { merge: false }>();

    const role = profile?.role ?? "tenant";
    const name = profile?.full_name ?? "User";
    const firstName = name.split(" ")[0];

    return (
        <div className="flex min-h-full flex-col">
            {/* Glass top nav */}
            <nav className="sticky top-0 w-full z-50 glass-nav shadow-[0px_20px_40px_rgba(26,27,34,0.06)]">
                <div className="flex justify-between items-center px-8 h-20 w-full max-w-screen-2xl mx-auto">
                    <div className="flex items-center gap-8">
                        <Link href="/" className="text-2xl font-black tracking-tighter text-emerald-900 dark:text-emerald-50 font-[family-name:var(--font-geist-sans)]">
                            Victoria&apos;s
                        </Link>
                        <div className="hidden md:flex items-center gap-6 font-[family-name:var(--font-geist-sans)] font-semibold tracking-tight">
                            <Link href="/tenant/browse" className="text-zinc-500 dark:text-zinc-400 hover:text-emerald-600 transition-colors">
                                Listings
                            </Link>
                            <Link href="/tenant" className="text-zinc-500 dark:text-zinc-400 hover:text-emerald-600 transition-colors">
                                Concierge
                            </Link>
                            <Link href="/tenant/saved" className="text-zinc-500 dark:text-zinc-400 hover:text-emerald-600 transition-colors">
                                Saved
                            </Link>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-3 pl-4 border-l border-zinc-200/50 dark:border-zinc-700/50">
                            <div className="text-right hidden sm:block">
                                <p className="text-[10px] font-[family-name:var(--font-geist-mono)] text-zinc-400 uppercase tracking-[0.2em]">
                                    {role === "landlord" ? "Landlord" : "Tenant"}
                                </p>
                                <p className="text-sm font-bold text-[#1a1b22] dark:text-zinc-50">{name}</p>
                            </div>
                            <div className="w-10 h-10 rounded-full bg-[#00873a] flex items-center justify-center text-white font-bold text-sm">
                                {firstName[0]?.toUpperCase() ?? "U"}
                            </div>
                            <form action="/api/auth/signout" method="POST">
                                <button
                                    type="submit"
                                    className="ml-2 px-4 py-2 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-sm font-semibold rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-transform active:scale-95"
                                >
                                    Sign Out
                                </button>
                            </form>
                        </div>
                    </div>
                </div>
            </nav>

            <main className="flex min-h-[calc(100vh-5rem)]">
                {/* Desktop Sidebar */}
                <aside className="h-[calc(100vh-5rem)] w-64 hidden md:flex flex-col sticky top-20 bg-zinc-50 dark:bg-zinc-950 py-8 px-4 gap-2 shrink-0">
                    {/* Tenant section */}
                    <div className="mb-6 px-4">
                        <p className="text-[10px] font-[family-name:var(--font-geist-mono)] uppercase tracking-[0.2em] text-zinc-400 mb-4">Tenant Portal</p>
                        <div className="space-y-1">
                            <Link href="/tenant" className="flex items-center gap-3 px-4 py-2.5 text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-900 rounded-lg transition-all">
                                <span>💬</span>
                                <span className="text-sm">Chat</span>
                            </Link>
                            <Link href="/tenant/browse" className="flex items-center gap-3 px-4 py-2.5 text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-900 rounded-lg transition-all">
                                <span>🔍</span>
                                <span className="text-sm">Browse</span>
                            </Link>
                            <Link href="/tenant/saved" className="flex items-center gap-3 px-4 py-2.5 text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-900 rounded-lg transition-all">
                                <span>❤️</span>
                                <span className="text-sm">Saved</span>
                            </Link>
                        </div>
                    </div>

                    {/* Landlord section */}
                    <div className="mb-6 px-4">
                        <p className="text-[10px] font-[family-name:var(--font-geist-mono)] uppercase tracking-[0.2em] text-zinc-400 mb-4">Landlord Tools</p>
                        <div className="space-y-1">
                            <Link href="/landlord" className="flex items-center gap-3 px-4 py-2.5 text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-900 rounded-lg transition-all">
                                <span>🏢</span>
                                <span className="text-sm">Listings</span>
                            </Link>
                            <Link href="/landlord/listings/new" className="flex items-center gap-3 px-4 py-2.5 text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-900 rounded-lg transition-all">
                                <span>➕</span>
                                <span className="text-sm">New Listing</span>
                            </Link>
                            <Link href="/landlord/inquiries" className="flex items-center gap-3 px-4 py-2.5 text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-900 rounded-lg transition-all">
                                <span>📩</span>
                                <span className="text-sm">Inquiries</span>
                            </Link>
                        </div>
                    </div>

                    {/* Upgrade card */}
                    <div className="mt-auto px-4 pb-12">
                        <div className="p-4 bg-emerald-50 dark:bg-emerald-950 rounded-2xl">
                            <p className="text-xs font-bold text-emerald-900 dark:text-emerald-300 mb-1">Victoria AI</p>
                            <p className="text-[11px] text-emerald-700 dark:text-emerald-400 leading-relaxed mb-3">Get personalized insights on your property performance.</p>
                            <button type="button" className="w-full py-2 bg-[#006b2c] text-white text-xs font-bold rounded-lg hover:opacity-90 transition-opacity">
                                Upgrade to Pro
                            </button>
                        </div>
                    </div>
                </aside>

                {/* Content */}
                <section className="flex-1 p-4 md:p-8 overflow-y-auto pb-24 md:pb-8">
                    {children}
                </section>
            </main>

            {/* Mobile bottom nav */}
            <nav className="fixed bottom-0 w-full z-50 rounded-t-3xl md:hidden bg-zinc-50/80 dark:bg-zinc-950/80 backdrop-blur-xl shadow-[0px_-10px_30px_rgba(0,0,0,0.05)]">
                <div className="flex justify-around items-center h-20 px-6">
                    <Link href="/tenant/browse" className="flex flex-col items-center justify-center text-zinc-400 dark:text-zinc-600 px-4 py-1">
                        <span>🔍</span>
                        <span className="font-[family-name:var(--font-geist-mono)] text-[10px] uppercase tracking-[0.2em] mt-1">Explore</span>
                    </Link>
                    <Link href="/tenant" className="flex flex-col items-center justify-center text-zinc-400 dark:text-zinc-600 px-4 py-1">
                        <span>✨</span>
                        <span className="font-[family-name:var(--font-geist-mono)] text-[10px] uppercase tracking-[0.2em] mt-1">Curator</span>
                    </Link>
                    <Link href="/tenant/saved" className="flex flex-col items-center justify-center text-zinc-400 dark:text-zinc-600 px-4 py-1">
                        <span>❤️</span>
                        <span className="font-[family-name:var(--font-geist-mono)] text-[10px] uppercase tracking-[0.2em] mt-1">Saved</span>
                    </Link>
                    <Link href={role === "landlord" ? "/landlord" : "/tenant"} className="flex flex-col items-center justify-center text-zinc-400 dark:text-zinc-600 px-4 py-1">
                        <span>👤</span>
                        <span className="font-[family-name:var(--font-geist-mono)] text-[10px] uppercase tracking-[0.2em] mt-1">Profile</span>
                    </Link>
                </div>
            </nav>
        </div>
    );
}
