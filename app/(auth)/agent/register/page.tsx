"use client";

import { useState } from "react";
import Link from "next/link";
import { tryCreateSupabaseBrowser } from "@/app/lib/supabase/client";

function normalizePhone(value: string): string | null {
    const trimmed = value.trim();
    const digits = trimmed.replace(/\D/g, "");
    if (digits.length < 10 || digits.length > 15) return null;
    if (trimmed.startsWith("+")) return `+${digits}`;
    if (digits.length === 11 && digits.startsWith("0")) return `+234${digits.slice(1)}`;
    return `+${digits}`;
}

export default function AgentRegisterPage(): React.ReactElement {
    const [fullName, setFullName] = useState("");
    const [email, setEmail] = useState("");
    const [phone, setPhone] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);

    const [{ client: supabase, error: supabaseError }] = useState(() =>
        tryCreateSupabaseBrowser(),
    );
    const activeError = error ?? supabaseError;
    const authUnavailable = !supabase;

    async function handleRegister(e: React.FormEvent): Promise<void> {
        e.preventDefault();

        if (!supabase) {
            setError(supabaseError ?? "Auth service unavailable.");
            return;
        }

        const normalizedPhone = normalizePhone(phone);
        if (!normalizedPhone) {
            setError("Enter a valid phone number with 10 to 15 digits.");
            return;
        }

        setError(null);
        setLoading(true);

        const { error: signUpError } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    full_name: fullName,
                    phone: normalizedPhone,
                    role: "agent",
                },
            },
        });

        setLoading(false);

        if (signUpError) {
            setError(signUpError.message);
            return;
        }

        setSuccess(true);
    }

    if (success) {
        return (
            <div className="bg-[#f8efe7] dark:bg-zinc-900 rounded-[2rem] p-8 md:p-12 ambient-shadow text-center space-y-4">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#f3ddc8] dark:bg-amber-900">
                    <span className="text-3xl">✓</span>
                </div>
                <h2 className="font-(family-name:--font-manrope) text-xl font-bold text-[#2a221d] dark:text-zinc-50">
                    Check your email
                </h2>
                <p className="text-sm text-[#6a5e54] dark:text-zinc-400">
                    We sent a confirmation link to{" "}
                    <strong className="text-[#7b5d43] dark:text-amber-400">{email}</strong>.
                    After confirming, sign in to access your agent dashboard.
                </p>
                <Link
                    href="/agent/login"
                    className="inline-block text-sm font-bold text-[#7b5d43] dark:text-amber-400 hover:underline underline-offset-4"
                >
                    Go to agent login →
                </Link>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            <div className="text-center">
                <h2 className="font-(family-name:--font-manrope) text-2xl font-bold dark:text-zinc-50">
                    Agent Registration
                </h2>
                <p className="text-[#6a5e54] dark:text-zinc-400 mt-1">
                    Create your agent account to manage landlords.
                </p>
            </div>

            <div className="bg-[#f8efe7] dark:bg-zinc-900 rounded-[2rem] p-8 md:p-12 ambient-shadow">
                {activeError && (
                    <div className="rounded-xl bg-[#ffdad6] dark:bg-red-950 p-4 text-sm text-[#93000a] dark:text-red-300 mb-6">
                        {activeError}
                    </div>
                )}

                <form onSubmit={handleRegister} className="space-y-6">
                    <div>
                        <label
                            htmlFor="fullName"
                            className="block text-xs font-mono uppercase tracking-[0.2em] text-[#6a5e54] dark:text-zinc-400 mb-2 ml-1"
                        >
                            Full Name
                        </label>
                        <input
                            id="fullName"
                            type="text"
                            required
                            disabled={authUnavailable || loading}
                            value={fullName}
                            onChange={(e) => setFullName(e.target.value)}
                            className="w-full bg-white dark:bg-zinc-800 border-none rounded-xl px-4 py-4 focus:ring-2 focus:ring-[#7b5d43]/20 text-[#2a221d] dark:text-zinc-50 placeholder:text-[#6e7b6c] dark:placeholder:text-zinc-500 transition-all"
                            placeholder="Emeka Obi"
                        />
                    </div>

                    <div>
                        <label
                            htmlFor="agentEmail"
                            className="block text-xs font-mono uppercase tracking-[0.2em] text-[#6a5e54] dark:text-zinc-400 mb-2 ml-1"
                        >
                            Email Address
                        </label>
                        <input
                            id="agentEmail"
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
                            htmlFor="agentPhone"
                            className="block text-xs font-mono uppercase tracking-[0.2em] text-[#6a5e54] dark:text-zinc-400 mb-2 ml-1"
                        >
                            Phone Number
                        </label>
                        <input
                            id="agentPhone"
                            type="tel"
                            required
                            disabled={authUnavailable || loading}
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            className="w-full bg-white dark:bg-zinc-800 border-none rounded-xl px-4 py-4 focus:ring-2 focus:ring-[#7b5d43]/20 text-[#2a221d] dark:text-zinc-50 placeholder:text-[#6e7b6c] dark:placeholder:text-zinc-500 transition-all"
                            placeholder="+2348012345678"
                        />
                    </div>

                    <div>
                        <label
                            htmlFor="agentPassword"
                            className="block text-xs font-mono uppercase tracking-[0.2em] text-[#6a5e54] dark:text-zinc-400 mb-2 ml-1"
                        >
                            Password
                        </label>
                        <input
                            id="agentPassword"
                            type="password"
                            required
                            minLength={8}
                            disabled={authUnavailable || loading}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full bg-white dark:bg-zinc-800 border-none rounded-xl px-4 py-4 focus:ring-2 focus:ring-[#7b5d43]/20 text-[#2a221d] dark:text-zinc-50 placeholder:text-[#6e7b6c] dark:placeholder:text-zinc-500 transition-all"
                            placeholder="••••••••"
                        />
                        <p className="mt-2 text-xs text-[#6e7b6c] dark:text-zinc-500 ml-1">Minimum 8 characters</p>
                    </div>

                    <button
                        type="submit"
                        disabled={authUnavailable || loading}
                        className="w-full py-4 rounded-xl btn-primary-gradient text-white font-bold tracking-tight shadow-lg shadow-[#7b5d43]/10 hover:scale-[1.01] active:scale-[0.98] transition-all disabled:opacity-50"
                    >
                        {loading ? "Creating account..." : "Create Agent Account"}
                    </button>
                </form>

                <p className="text-center mt-10 text-[#6a5e54] dark:text-zinc-400 text-sm">
                    Already registered?{" "}
                    <Link
                        href="/agent/login"
                        className="text-[#7b5d43] dark:text-amber-400 font-bold hover:underline underline-offset-4"
                    >
                        Sign in
                    </Link>
                </p>

                <p className="text-center mt-4 text-[#6a5e54] dark:text-zinc-400 text-sm">
                    Are you a tenant or landlord?{" "}
                    <Link
                        href="/register"
                        className="text-[#7b5d43] dark:text-amber-400 font-bold hover:underline underline-offset-4"
                    >
                        Register here
                    </Link>
                </p>
            </div>
        </div>
    );
}
