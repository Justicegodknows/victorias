"use client";

import { useState } from "react";
import Link from "next/link";
import { tryCreateSupabaseBrowser } from "@/app/lib/supabase/client";

export default function AgentLoginPage(): React.ReactElement {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const [{ client: supabase, error: supabaseError }] = useState(() =>
        tryCreateSupabaseBrowser(),
    );
    const activeError = error ?? supabaseError;
    const authUnavailable = !supabase;

    async function handleLogin(e: React.FormEvent): Promise<void> {
        e.preventDefault();

        if (!supabase) {
            setError(supabaseError ?? "Auth service unavailable.");
            return;
        }

        setError(null);
        setLoading(true);

        const {
            data: { user },
            error: signInError,
        } = await supabase.auth.signInWithPassword({ email, password });

        if (signInError) {
            setError(signInError.message);
            setLoading(false);
            return;
        }

        if (!user) {
            setError("Sign-in succeeded but no session was returned.");
            setLoading(false);
            return;
        }

        // Verify this account is an agent
        const { data: profile } = await supabase
            .from("profiles")
            .select("role")
            .eq("id", user.id)
            .maybeSingle()
            .overrideTypes<{ role: string }, { merge: false }>();

        if (profile?.role !== "agent") {
            await supabase.auth.signOut();
            setError("This account is not an agent account. Use the main login instead.");
            setLoading(false);
            return;
        }

        window.location.href = "/agent";
    }

    return (
        <div className="space-y-8">
            <div className="text-center">
                <h2 className="font-(family-name:--font-manrope) text-2xl font-bold dark:text-zinc-50">
                    Agent Login
                </h2>
                <p className="text-[#6a5e54] dark:text-zinc-400 mt-1">
                    Sign in to your agent dashboard.
                </p>
            </div>

            <div className="bg-[#f8efe7] dark:bg-zinc-900 rounded-[2rem] p-8 md:p-12 ambient-shadow">
                {activeError && (
                    <div className="rounded-xl bg-[#ffdad6] dark:bg-red-950 p-4 text-sm text-[#93000a] dark:text-red-300 mb-6">
                        {activeError}
                    </div>
                )}

                <form onSubmit={handleLogin} className="space-y-6">
                    <div>
                        <label
                            htmlFor="agentLoginEmail"
                            className="block text-xs font-mono uppercase tracking-[0.2em] text-[#6a5e54] dark:text-zinc-400 mb-2 ml-1"
                        >
                            Email Address
                        </label>
                        <input
                            id="agentLoginEmail"
                            type="email"
                            required
                            disabled={authUnavailable || loading}
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full bg-white dark:bg-zinc-800 border-none rounded-xl px-4 py-4 focus:ring-2 focus:ring-[#7b5d43]/20 text-[#2a221d] dark:text-zinc-50 placeholder:text-[#6e7b6c] dark:placeholder:text-zinc-500 transition-all"
                            placeholder="agent@victorias.luxury"
                        />
                    </div>

                    <div>
                        <label
                            htmlFor="agentLoginPassword"
                            className="block text-xs font-mono uppercase tracking-[0.2em] text-[#6a5e54] dark:text-zinc-400 mb-2 ml-1"
                        >
                            Password
                        </label>
                        <div className="relative">
                            <input
                                id="agentLoginPassword"
                                type={showPassword ? "text" : "password"}
                                required
                                disabled={authUnavailable || loading}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full bg-white dark:bg-zinc-800 border-none rounded-xl px-4 py-4 pr-12 focus:ring-2 focus:ring-[#7b5d43]/20 text-[#2a221d] dark:text-zinc-50 placeholder:text-[#6e7b6c] dark:placeholder:text-zinc-500 transition-all"
                                placeholder="••••••••"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                disabled={authUnavailable || loading}
                                className="absolute right-4 top-1/2 -translate-y-1/2 text-[#6e7b6c] dark:text-zinc-500 hover:text-[#2a221d] dark:hover:text-zinc-300 transition-colors"
                            >
                                {showPassword ? "Hide" : "Show"}
                            </button>
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={authUnavailable || loading}
                        className="w-full py-4 rounded-xl btn-primary-gradient text-white font-bold tracking-tight shadow-lg shadow-[#7b5d43]/10 hover:scale-[1.01] active:scale-[0.98] transition-all disabled:opacity-50"
                    >
                        {loading ? "Signing in..." : "Sign In as Agent"}
                    </button>
                </form>

                <p className="text-center mt-10 text-[#6a5e54] dark:text-zinc-400 text-sm">
                    Don&apos;t have an agent account?{" "}
                    <Link
                        href="/agent/register"
                        className="text-[#7b5d43] dark:text-amber-400 font-bold hover:underline underline-offset-4"
                    >
                        Register
                    </Link>
                </p>

                <p className="text-center mt-4 text-[#6a5e54] dark:text-zinc-400 text-sm">
                    Tenant or landlord?{" "}
                    <Link
                        href="/login"
                        className="text-[#7b5d43] dark:text-amber-400 font-bold hover:underline underline-offset-4"
                    >
                        Main login
                    </Link>
                </p>
            </div>
        </div>
    );
}
