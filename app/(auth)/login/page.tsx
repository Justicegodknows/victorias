"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { tryCreateSupabaseBrowser } from "@/app/lib/supabase/client";

function getCallbackErrorMessage(errorCode: string | null): string | null {
    if (!errorCode) {
        return null;
    }

    if (errorCode === "auth_callback_failed") {
        return "Sign-in failed. Please try again.";
    }

    return "Authentication could not be completed.";
}

function LoginPageContent(): React.ReactElement {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [phone, setPhone] = useState("");
    const [otp, setOtp] = useState("");
    const [authMode, setAuthMode] = useState<"email" | "phone">("email");
    const [otpSent, setOtpSent] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [{ client: supabase, error: supabaseError }] = useState(() =>
        tryCreateSupabaseBrowser(),
    );
    const searchParams = useSearchParams();
    const callbackError = getCallbackErrorMessage(searchParams.get("error"));
    const activeError = error ?? callbackError ?? supabaseError;
    const authUnavailable = !supabase;

    async function resolvePostLoginPath(userId: string): Promise<string> {
        if (!supabase) {
            return "/tenant/browse";
        }

        const { data: profile } = await supabase
            .from("profiles")
            .select("role")
            .eq("id", userId)
            .maybeSingle()
            .overrideTypes<{ role: "tenant" | "landlord" }, { merge: false }>();

        return profile?.role === "landlord" ? "/landlord" : "/tenant/browse";
    }

    async function handleGoogleSignIn(): Promise<void> {
        if (!supabase) {
            setError(supabaseError ?? "Supabase auth is unavailable.");
            return;
        }

        setError(null);
        setLoading(true);

        const { error } = await supabase.auth.signInWithOAuth({
            provider: "google",
            options: {
                redirectTo: `${window.location.origin}/api/auth/callback`,
                queryParams: {
                    access_type: "offline",
                    prompt: "consent",
                },
            },
        });

        if (error) {
            setError(error.message);
            setLoading(false);
        }
    }

    async function handleEmailLogin(e: React.FormEvent): Promise<void> {
        e.preventDefault();

        if (!supabase) {
            setError(supabaseError ?? "Supabase auth is unavailable.");
            return;
        }

        setError(null);
        setLoading(true);

        const {
            data: { user },
            error,
        } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        if (error) {
            setError(error.message);
            setLoading(false);
            return;
        }

        if (!user) {
            setError("Sign-in succeeded but no user session was returned.");
            setLoading(false);
            return;
        }

        window.location.href = await resolvePostLoginPath(user.id);
    }

    async function handleSendOtp(): Promise<void> {
        if (!supabase) {
            setError(supabaseError ?? "Supabase auth is unavailable.");
            return;
        }

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

        if (!supabase) {
            setError(supabaseError ?? "Supabase auth is unavailable.");
            return;
        }

        setError(null);
        setLoading(true);

        const {
            data: { user },
            error,
        } = await supabase.auth.verifyOtp({
            phone,
            token: otp,
            type: "sms",
        });

        if (error) {
            setError(error.message);
            setLoading(false);
            return;
        }

        if (!user) {
            setError("Verification succeeded but no user session was returned.");
            setLoading(false);
            return;
        }

        window.location.href = await resolvePostLoginPath(user.id);
    }

    return (
        <div className="space-y-6">
            {/* Login Card */}
            <div className="bg-[#f8efe7] dark:bg-zinc-900 rounded-[2rem] p-8 md:p-12 ambient-shadow relative overflow-hidden">
                {/* Tab Switcher */}
                <div className="flex gap-1 bg-[#efe0d2] dark:bg-zinc-800 p-1 rounded-2xl mb-10 w-fit mx-auto">
                    <button
                        type="button"
                        onClick={() => {
                            setAuthMode("email");
                            setError(null);
                        }}
                        className={`px-6 py-2 rounded-xl text-sm font-semibold transition-all ${
                            authMode === "email"
                                ? "bg-white dark:bg-zinc-700 text-[#7b5d43] dark:text-amber-400 shadow-sm"
                                : "text-[#6a5e54] dark:text-zinc-400 hover:text-[#2a221d] dark:hover:text-zinc-200"
                        }`}
                    >
                        Email
                    </button>
                    <button
                        type="button"
                        onClick={() => {
                            setAuthMode("phone");
                            setError(null);
                        }}
                        className={`px-6 py-2 rounded-xl text-sm font-semibold transition-all ${
                            authMode === "phone"
                                ? "bg-white dark:bg-zinc-700 text-[#7b5d43] dark:text-amber-400 shadow-sm"
                                : "text-[#6a5e54] dark:text-zinc-400 hover:text-[#2a221d] dark:hover:text-zinc-200"
                        }`}
                    >
                        Phone OTP
                    </button>
                </div>

                {activeError && (
                    <div className="rounded-xl bg-[#ffdad6] dark:bg-red-950 p-4 text-sm text-[#93000a] dark:text-red-300 mb-6">
                        {activeError}
                    </div>
                )}

                {authMode === "email" ? (
                    <form onSubmit={handleEmailLogin} className="space-y-6">
                        <div>
                            <label htmlFor="email" className="block text-xs font-mono uppercase tracking-[0.2em] text-[#6a5e54] dark:text-zinc-400 mb-2 ml-1">
                                Email Address
                            </label>
                            <input
                                id="email"
                                type="email"
                                required
                                disabled={authUnavailable || loading}
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full bg-white dark:bg-zinc-800 border-none rounded-xl px-4 py-4 focus:ring-2 focus:ring-[#7b5d43]/20 text-[#2a221d] dark:text-zinc-50 placeholder:text-[#6e7b6c] dark:placeholder:text-zinc-500 transition-all"
                                placeholder="curator@victorias.luxury"
                            />
                        </div>
                        <div>
                            <label htmlFor="password" className="block text-xs font-mono uppercase tracking-[0.2em] text-[#6a5e54] dark:text-zinc-400 mb-2 ml-1">
                                Password
                            </label>
                            <div className="relative">
                                <input
                                    id="password"
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
                        <div className="flex justify-end">
                            <button type="button" className="text-sm font-medium text-[#7b5d43] dark:text-amber-400 hover:underline underline-offset-4">
                                Forgot password?
                            </button>
                        </div>
                        <button
                            type="submit"
                            disabled={authUnavailable || loading}
                            className="w-full py-4 rounded-xl btn-primary-gradient text-white font-bold tracking-tight shadow-lg shadow-[#7b5d43]/10 hover:scale-[1.01] active:scale-[0.98] transition-all disabled:opacity-50"
                        >
                            {loading ? "Signing in..." : "Sign In"}
                        </button>
                    </form>
                ) : !otpSent ? (
                    <div className="space-y-6">
                        <div>
                            <label htmlFor="phone" className="block text-xs font-mono uppercase tracking-[0.2em] text-[#6a5e54] dark:text-zinc-400 mb-2 ml-1">
                                Phone Number
                            </label>
                            <input
                                id="phone"
                                type="tel"
                                required
                                disabled={authUnavailable || loading}
                                value={phone}
                                onChange={(e) => setPhone(e.target.value)}
                                className="w-full bg-white dark:bg-zinc-800 border-none rounded-xl px-4 py-4 focus:ring-2 focus:ring-[#7b5d43]/20 text-[#2a221d] dark:text-zinc-50 placeholder:text-[#6e7b6c] dark:placeholder:text-zinc-500 transition-all"
                                placeholder="+234 800 000 0000"
                            />
                        </div>
                        <button
                            type="button"
                            onClick={handleSendOtp}
                            disabled={authUnavailable || loading || !phone}
                            className="w-full py-4 rounded-xl btn-primary-gradient text-white font-bold tracking-tight shadow-lg shadow-[#7b5d43]/10 hover:scale-[1.01] active:scale-[0.98] transition-all disabled:opacity-50"
                        >
                            {loading ? "Sending..." : "Send OTP"}
                        </button>
                    </div>
                ) : (
                    <div className="space-y-6">
                        <div className="flex items-center gap-4 mb-2">
                            <button
                                type="button"
                                onClick={() => setOtpSent(false)}
                                className="w-10 h-10 rounded-full bg-[#efe0d2] dark:bg-zinc-800 flex items-center justify-center text-[#2a221d] dark:text-zinc-50 hover:bg-[#dad9e3] transition-colors"
                            >
                                ←
                            </button>
                            <h3 className="font-(family-name:--font-manrope) font-bold text-lg dark:text-zinc-50">Verify OTP</h3>
                        </div>
                        <p className="text-sm text-[#6a5e54] dark:text-zinc-400">
                            We&apos;ve sent a code to <span className="font-mono text-[#7b5d43] dark:text-amber-400">{phone}</span>
                        </p>
                        <form onSubmit={handleVerifyOtp} className="space-y-6">
                            <input
                                id="otp"
                                type="text"
                                required
                                disabled={authUnavailable || loading}
                                inputMode="numeric"
                                pattern="[0-9]*"
                                maxLength={6}
                                value={otp}
                                onChange={(e) => setOtp(e.target.value)}
                                className="w-full bg-white dark:bg-zinc-800 border-none rounded-xl px-4 py-4 text-center text-2xl font-mono font-bold tracking-[0.5em] focus:ring-2 focus:ring-[#7b5d43]/20 text-[#2a221d] dark:text-zinc-50 transition-all"
                                placeholder="000000"
                            />
                            <button
                                type="submit"
                                disabled={authUnavailable || loading}
                                className="w-full py-4 rounded-xl bg-[#7b5d43] text-white font-bold shadow-lg shadow-[#7b5d43]/20 hover:bg-[#d78f45] transition-all disabled:opacity-50"
                            >
                                {loading ? "Verifying..." : "Verify & Continue"}
                            </button>
                        </form>
                    </div>
                )}

                {!otpSent && (
                    <>
                        <div className="relative my-10">
                            <div className="absolute inset-0 flex items-center">
                                <div className="w-full border-t border-[#bdcaba]/30" />
                            </div>
                            <div className="relative flex justify-center text-xs uppercase font-mono tracking-[0.2em]">
                                <span className="bg-[#f8efe7] dark:bg-zinc-900 px-4 text-[#6e7b6c] dark:text-zinc-500">
                                    Or continue with
                                </span>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <button
                                type="button"
                                onClick={handleGoogleSignIn}
                                disabled={authUnavailable || loading}
                                className="flex items-center justify-center gap-3 py-3 rounded-xl bg-[#efe0d2] dark:bg-zinc-800 text-[#6a5e54] dark:text-zinc-400 font-medium hover:bg-[#e8e7f1] dark:hover:bg-zinc-700 transition-colors disabled:opacity-50"
                            >
                                <svg className="w-5 h-5" viewBox="0 0 24 24">
                                    <path
                                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                                        fill="#4285F4"
                                    />
                                    <path
                                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                                        fill="#34A853"
                                    />
                                    <path
                                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                                        fill="#FBBC05"
                                    />
                                    <path
                                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                                        fill="#EA4335"
                                    />
                                </svg>
                                Google
                            </button>
                            <button
                                type="button"
                                disabled
                                className="flex items-center justify-center gap-3 py-3 rounded-xl bg-[#efe0d2] dark:bg-zinc-800 text-[#6a5e54] dark:text-zinc-400 font-medium opacity-60"
                            >
                                Facebook
                            </button>
                        </div>

                        <p className="text-center mt-10 text-[#6a5e54] dark:text-zinc-400 text-sm">
                            Don&apos;t have an account?
                            <Link
                                href="/register"
                                className="text-[#7b5d43] dark:text-amber-400 font-bold ml-1 hover:underline underline-offset-4"
                            >
                                Create an account
                            </Link>
                        </p>
                    </>
                )}
            </div>
        </div>
    );
}

function LoginPageFallback(): React.ReactElement {
    return (
        <div className="space-y-6">
            <div className="bg-[#f8efe7] dark:bg-zinc-900 rounded-[2rem] p-8 md:p-12 ambient-shadow relative overflow-hidden min-h-128" />
        </div>
    );
}

export default function LoginPage(): React.ReactElement {
    return (
        <Suspense fallback={<LoginPageFallback />}>
            <LoginPageContent />
        </Suspense>
    );
}
