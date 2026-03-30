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

    return (
        <div className="flex min-h-full flex-col">
            {/* Top nav */}
            <header className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
                <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4">
                    <Link href="/" className="text-lg font-bold text-green-600">
                        Victoria&apos;s
                    </Link>

                    <nav className="flex items-center gap-6 text-sm">
                        {role === "tenant" ? (
                            <>
                                <Link href="/tenant" className="text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50">
                                    Chat
                                </Link>
                                <Link href="/tenant/browse" className="text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50">
                                    Browse
                                </Link>
                                <Link href="/tenant/saved" className="text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50">
                                    Saved
                                </Link>
                            </>
                        ) : (
                            <>
                                <Link href="/landlord" className="text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50">
                                    Listings
                                </Link>
                                <Link href="/landlord/listings/new" className="text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50">
                                    New Listing
                                </Link>
                                <Link href="/landlord/inquiries" className="text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50">
                                    Inquiries
                                </Link>
                            </>
                        )}
                    </nav>

                    <div className="flex items-center gap-3">
                        <span className="text-sm text-zinc-600 dark:text-zinc-400">{name}</span>
                        <form action="/api/auth/signout" method="POST">
                            <button
                                type="submit"
                                className="rounded-md px-3 py-1.5 text-sm text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
                            >
                                Sign out
                            </button>
                        </form>
                    </div>
                </div>
            </header>

            {/* Main content */}
            <main className="flex flex-1 flex-col">{children}</main>
        </div>
    );
}
