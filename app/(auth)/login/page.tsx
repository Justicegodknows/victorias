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
    const [showPassword, setShowPassword] = useState(false);

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
            {/* Login Card */}
            <div className="bg-[#f8efe7] dark:bg-zinc-900 rounded-[2rem] p-8 md:p-12 ambient-shadow relative overflow-hidden">
                {/* Tab Switcher */}
                <div className="flex gap-1 bg-[#efe0d2] dark:bg-zinc-800 p-1 rounded-2xl mb-10 w-fit mx-auto">
                    <button
                        type="button"
                        onClick={() => { setAuthMode("email"); setError(null); }}
                        className={`px-6 py-2 rounded-xl text-sm font-semibold transition-all ${authMode === "email"
                                ? "bg-white dark:bg-zinc-700 text-[#7b5d43] dark:text-amber-400 shadow-sm"
                                : "text-[#6a5e54] dark:text-zinc-400 hover:text-[#2a221d] dark:hover:text-zinc-200"
                            }`}
                    >
                        Email
                    </button>
                    <button
                        type="button"
                        onClick={() => { setAuthMode("phone"); setError(null); }}
                        className={`px-6 py-2 rounded-xl text-sm font-semibold transition-all ${authMode === "phone"
                                ? "bg-white dark:bg-zinc-700 text-[#7b5d43] dark:text-amber-400 shadow-sm"
                                : "text-[#6a5e54] dark:text-zinc-400 hover:text-[#2a221d] dark:hover:text-zinc-200"
                            }`}
                    >
                        Phone OTP
                    </button>
                </div>

                {error && (
                    <div className="rounded-xl bg-[#ffdad6] dark:bg-red-950 p-4 text-sm text-[#93000a] dark:text-red-300 mb-6">
                        {error}
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
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full bg-white dark:bg-zinc-800 border-none rounded-xl px-4 py-4 pr-12 focus:ring-2 focus:ring-[#7b5d43]/20 text-[#2a221d] dark:text-zinc-50 placeholder:text-[#6e7b6c] dark:placeholder:text-zinc-500 transition-all"
                                    placeholder="••••••••"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-[#6e7b6c] dark:text-zinc-500 hover:text-[#2a221d] dark:hover:text-zinc-300 transition-colors"
                                >
                                    {showPassword ? "🙈" : "👁"}
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
                            disabled={loading}
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
                                value={phone}
                                onChange={(e) => setPhone(e.target.value)}
                                className="w-full bg-white dark:bg-zinc-800 border-none rounded-xl px-4 py-4 focus:ring-2 focus:ring-[#7b5d43]/20 text-[#2a221d] dark:text-zinc-50 placeholder:text-[#6e7b6c] dark:placeholder:text-zinc-500 transition-all"
                                placeholder="+234 800 000 0000"
                            />
                        </div>
                        <button
                            type="button"
                            onClick={handleSendOtp}
                            disabled={loading || !phone}
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
                                disabled={loading}
                                className="w-full py-4 rounded-xl bg-[#7b5d43] text-white font-bold shadow-lg shadow-[#7b5d43]/20 hover:bg-[#d78f45] transition-all disabled:opacity-50"
                            >
                                {loading ? "Verifying..." : "Verify & Continue"}
                            </button>
                        </form>
                    </div>
                )}

                {/* Divider */}
                {!otpSent && (
                    <>
                        <div className="relative my-10">
                            <div className="absolute inset-0 flex items-center">
                                <div className="w-full border-t border-[#bdcaba]/30" />
                            </div>
                            <div className="relative flex justify-center text-xs uppercase font-mono tracking-[0.2em]">
                                <span className="bg-[#f8efe7] dark:bg-zinc-900 px-4 text-[#6e7b6c] dark:text-zinc-500">Or continue with</span>
                            </div>
                        </div>

                        {/* Social */}
                        <div className="grid grid-cols-2 gap-4">
                            <button type="button" className="flex items-center justify-center gap-3 py-3 rounded-xl bg-[#efe0d2] dark:bg-zinc-800 text-[#6a5e54] dark:text-zinc-400 font-medium hover:bg-[#e8e7f1] dark:hover:bg-zinc-700 transition-colors">
                                Google
                            </button>
                            <button type="button" className="flex items-center justify-center gap-3 py-3 rounded-xl bg-[#efe0d2] dark:bg-zinc-800 text-[#6a5e54] dark:text-zinc-400 font-medium hover:bg-[#e8e7f1] dark:hover:bg-zinc-700 transition-colors">
                                Facebook
                            </button>
                        </div>

                        {/* Footer link */}
                        <p className="text-center mt-10 text-[#6a5e54] dark:text-zinc-400 text-sm">
                            Don&apos;t have an account?
                            <Link href="/register" className="text-[#7b5d43] dark:text-amber-400 font-bold ml-1 hover:underline underline-offset-4">
                                Create an account
                            </Link>
                        </p>
                    </>
                )}
            </div>
        </div>
    );
}
