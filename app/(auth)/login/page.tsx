"use client";

import { useState } from "react";
import { createSupabaseBrowser } from "@/app/lib/supabase/client";
import Link from "next/link";

export default function LoginPage(): React.ReactElement {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [phone, setPhone] = useState("");
    const [otp, setOtp] = useState("");
    const [authMode, setAuthMode] = useState<"email" | "phone">("email");
    const [otpSent, setOtpSent] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const supabase = createSupabaseBrowser();

    async function handleEmailLogin(e: React.FormEvent): Promise<void> {
        e.preventDefault();
        setError(null);
        setLoading(true);

        const { error } = await supabase.auth.signInWithPassword({ email, password });

        if (error) {
            setError(error.message);
            setLoading(false);
            return;
        }

        window.location.href = "/tenant";
    }

    async function handleSendOtp(): Promise<void> {
        setError(null);
        setLoading(true);

        const { error } = await supabase.auth.signInWithOtp({ phone });

        if (error) {
            setError(error.message);
            setLoading(false);
            return;
        }

        setOtpSent(true);
        setLoading(false);
    }

    async function handleVerifyOtp(e: React.FormEvent): Promise<void> {
        e.preventDefault();
        setError(null);
        setLoading(true);

        const { error } = await supabase.auth.verifyOtp({
            phone,
            token: otp,
            type: "sms",
        });

        if (error) {
            setError(error.message);
            setLoading(false);
            return;
        }

        window.location.href = "/tenant";
    }

    return (
        <div className="space-y-6">
            <div className="text-center">
                <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
                    Welcome back
                </h1>
                <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                    Sign in to find your perfect apartment
                </p>
            </div>

            {/* Auth mode toggle */}
            <div className="flex rounded-lg bg-zinc-100 p-1 dark:bg-zinc-800">
                <button
                    type="button"
                    onClick={() => { setAuthMode("email"); setError(null); }}
                    className={`flex-1 rounded-md py-2 text-sm font-medium transition-colors ${authMode === "email"
                            ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-700 dark:text-zinc-50"
                            : "text-zinc-600 dark:text-zinc-400"
                        }`}
                >
                    Email
                </button>
                <button
                    type="button"
                    onClick={() => { setAuthMode("phone"); setError(null); }}
                    className={`flex-1 rounded-md py-2 text-sm font-medium transition-colors ${authMode === "phone"
                            ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-700 dark:text-zinc-50"
                            : "text-zinc-600 dark:text-zinc-400"
                        }`}
                >
                    Phone
                </button>
            </div>

            {error && (
                <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
                    {error}
                </div>
            )}

            {authMode === "email" ? (
                <form onSubmit={handleEmailLogin} className="space-y-4">
                    <div>
                        <label htmlFor="email" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                            Email
                        </label>
                        <input
                            id="email"
                            type="email"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="mt-1 block w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm shadow-sm focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-50"
                            placeholder="you@example.com"
                        />
                    </div>
                    <div>
                        <label htmlFor="password" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                            Password
                        </label>
                        <input
                            id="password"
                            type="password"
                            required
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="mt-1 block w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm shadow-sm focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-50"
                            placeholder="••••••••"
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full rounded-lg bg-green-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50"
                    >
                        {loading ? "Signing in..." : "Sign in"}
                    </button>
                </form>
            ) : (
                <div className="space-y-4">
                    <div>
                        <label htmlFor="phone" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                            Phone Number
                        </label>
                        <input
                            id="phone"
                            type="tel"
                            required
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            className="mt-1 block w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm shadow-sm focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-50"
                            placeholder="+234 800 000 0000"
                        />
                    </div>
                    {!otpSent ? (
                        <button
                            type="button"
                            onClick={handleSendOtp}
                            disabled={loading || !phone}
                            className="w-full rounded-lg bg-green-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50"
                        >
                            {loading ? "Sending..." : "Send OTP"}
                        </button>
                    ) : (
                        <form onSubmit={handleVerifyOtp} className="space-y-4">
                            <div>
                                <label htmlFor="otp" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                                    Enter OTP
                                </label>
                                <input
                                    id="otp"
                                    type="text"
                                    required
                                    inputMode="numeric"
                                    pattern="[0-9]*"
                                    maxLength={6}
                                    value={otp}
                                    onChange={(e) => setOtp(e.target.value)}
                                    className="mt-1 block w-full rounded-lg border border-zinc-300 px-3 py-2 text-center text-lg tracking-widest shadow-sm focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-50"
                                    placeholder="000000"
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full rounded-lg bg-green-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50"
                            >
                                {loading ? "Verifying..." : "Verify & Sign in"}
                            </button>
                        </form>
                    )}
                </div>
            )}

            <p className="text-center text-sm text-zinc-600 dark:text-zinc-400">
                Don&apos;t have an account?{" "}
                <Link href="/register" className="font-medium text-green-600 hover:text-green-500">
                    Create account
                </Link>
            </p>
        </div>
    );
}
