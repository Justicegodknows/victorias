"use client";

import { useState } from "react";
import { createSupabaseBrowser } from "@/app/lib/supabase/client";
import Link from "next/link";
import type { GovernmentIdType, UserRole } from "@/app/lib/types";

const GOVERNMENT_ID_LABELS: Record<GovernmentIdType, string> = {
    "national-id-card": "National ID Card",
    "drivers-license": "Driver's License",
    "international-passport": "International Passport",
    "voters-card": "Voter's Card",
};

export default function RegisterPage(): React.ReactElement {
    const [fullName, setFullName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [role, setRole] = useState<UserRole>("tenant");
    const [nin, setNin] = useState("");
    const [bvn, setBvn] = useState("");
    const [governmentIdType, setGovernmentIdType] = useState<GovernmentIdType>("national-id-card");
    const [governmentIdNumber, setGovernmentIdNumber] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);

    const supabase = createSupabaseBrowser();

    async function handleRegister(e: React.FormEvent): Promise<void> {
        e.preventDefault();
        setError(null);

        const sanitizedNin = nin.replace(/\D/g, "");
        const sanitizedBvn = bvn.replace(/\D/g, "");

        if (role === "tenant") {
            if (!/^\d{11}$/.test(sanitizedNin)) {
                setError("NIN must be exactly 11 digits.");
                return;
            }
            if (!/^\d{11}$/.test(sanitizedBvn)) {
                setError("BVN must be exactly 11 digits.");
                return;
            }
        }

        setLoading(true);

        const { error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    full_name: fullName,
                    role,
                    nin: role === "tenant" ? sanitizedNin : null,
                    bvn: role === "tenant" ? sanitizedBvn : null,
                    government_id_type:
                        role === "tenant" && governmentIdNumber.trim()
                            ? governmentIdType
                            : null,
                    government_id_number:
                        role === "tenant" && governmentIdNumber.trim()
                            ? governmentIdNumber.trim()
                            : null,
                },
            },
        });

        if (error) {
            setError(error.message);
            setLoading(false);
            return;
        }

        setSuccess(true);
        setLoading(false);
    }

    if (success) {
        return (
            <div className="bg-[#f4f2fd] dark:bg-zinc-900 rounded-[2rem] p-8 md:p-12 ambient-shadow text-center space-y-4">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#baecbc] dark:bg-emerald-900">
                    <span className="text-3xl">✓</span>
                </div>
                <h2 className="font-(family-name:--font-manrope) text-xl font-bold text-[#1a1b22] dark:text-zinc-50">
                    Check your email
                </h2>
                <p className="text-sm text-[#3e4a3d] dark:text-zinc-400">
                    We sent a confirmation link to <strong className="text-[#006b2c] dark:text-emerald-400">{email}</strong>. Click the link to activate your account.
                </p>
                <Link
                    href="/login"
                    className="inline-block text-sm font-bold text-[#006b2c] dark:text-emerald-400 hover:underline underline-offset-4"
                >
                    Back to login
                </Link>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            {/* Role Selector */}
            <div className="space-y-6">
                <div className="text-center">
                    <h2 className="font-(family-name:--font-manrope) text-2xl font-bold dark:text-zinc-50">Choose your role</h2>
                    <p className="text-[#3e4a3d] dark:text-zinc-400 mt-1">Get started with the curator.</p>
                </div>
                <div className="grid grid-cols-2 gap-6">
                    <button
                        type="button"
                        onClick={() => setRole("tenant")}
                        className={`group cursor-pointer p-6 rounded-3xl ambient-shadow transition-all relative overflow-hidden text-left ${role === "tenant"
                            ? "bg-[#006b2c]/5 dark:bg-emerald-900/20 ring-2 ring-[#006b2c] dark:ring-emerald-400"
                            : "bg-[#f4f2fd] dark:bg-zinc-900 hover:bg-[#006b2c]/5 dark:hover:bg-zinc-800"
                            }`}
                    >
                        <div className="mb-4 w-12 h-12 rounded-2xl bg-[#baecbc] dark:bg-emerald-900 flex items-center justify-center">
                            <span className="text-2xl">🏠</span>
                        </div>
                        <h3 className="font-bold text-lg mb-1 dark:text-zinc-50">Tenant</h3>
                        <p className="text-xs text-[#3e4a3d] dark:text-zinc-400 leading-relaxed">Find your dream home with AI assistance.</p>
                        {role === "tenant" && (
                            <div className="absolute top-2 right-2">
                                <span className="text-[#006b2c] dark:text-emerald-400">✓</span>
                            </div>
                        )}
                    </button>
                    <button
                        type="button"
                        onClick={() => setRole("landlord")}
                        className={`group cursor-pointer p-6 rounded-3xl ambient-shadow transition-all relative overflow-hidden text-left ${role === "landlord"
                            ? "bg-[#006b2c]/5 dark:bg-emerald-900/20 ring-2 ring-[#006b2c] dark:ring-emerald-400"
                            : "bg-[#f4f2fd] dark:bg-zinc-900 hover:bg-[#006b2c]/5 dark:hover:bg-zinc-800"
                            }`}
                    >
                        <div className="mb-4 w-12 h-12 rounded-2xl bg-[#00873a] flex items-center justify-center">
                            <span className="text-2xl">🏢</span>
                        </div>
                        <h3 className="font-bold text-lg mb-1 dark:text-zinc-50">Landlord</h3>
                        <p className="text-xs text-[#3e4a3d] dark:text-zinc-400 leading-relaxed">List and manage your premium assets.</p>
                        {role === "landlord" && (
                            <div className="absolute top-2 right-2">
                                <span className="text-[#006b2c] dark:text-emerald-400">✓</span>
                            </div>
                        )}
                    </button>
                </div>
            </div>

            {/* Registration Card */}
            <div className="bg-[#f4f2fd] dark:bg-zinc-900 rounded-[2rem] p-8 md:p-12 ambient-shadow relative overflow-hidden">
                {error && (
                    <div className="rounded-xl bg-[#ffdad6] dark:bg-red-950 p-4 text-sm text-[#93000a] dark:text-red-300 mb-6">
                        {error}
                    </div>
                )}

                <form onSubmit={handleRegister} className="space-y-6">
                    <div>
                        <label htmlFor="fullName" className="block text-xs font-mono uppercase tracking-[0.2em] text-[#3e4a3d] dark:text-zinc-400 mb-2 ml-1">
                            Full Name
                        </label>
                        <input
                            id="fullName"
                            type="text"
                            required
                            value={fullName}
                            onChange={(e) => setFullName(e.target.value)}
                            className="w-full bg-white dark:bg-zinc-800 border-none rounded-xl px-4 py-4 focus:ring-2 focus:ring-[#006b2c]/20 text-[#1a1b22] dark:text-zinc-50 placeholder:text-[#6e7b6c] dark:placeholder:text-zinc-500 transition-all"
                            placeholder="Adaeze Okafor"
                        />
                    </div>

                    <div>
                        <label htmlFor="registerEmail" className="block text-xs font-mono uppercase tracking-[0.2em] text-[#3e4a3d] dark:text-zinc-400 mb-2 ml-1">
                            Email Address
                        </label>
                        <input
                            id="registerEmail"
                            type="email"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full bg-white dark:bg-zinc-800 border-none rounded-xl px-4 py-4 focus:ring-2 focus:ring-[#006b2c]/20 text-[#1a1b22] dark:text-zinc-50 placeholder:text-[#6e7b6c] dark:placeholder:text-zinc-500 transition-all"
                            placeholder="curator@victorias.luxury"
                        />
                    </div>

                    <div>
                        <label htmlFor="registerPassword" className="block text-xs font-mono uppercase tracking-[0.2em] text-[#3e4a3d] dark:text-zinc-400 mb-2 ml-1">
                            Password
                        </label>
                        <input
                            id="registerPassword"
                            type="password"
                            required
                            minLength={8}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full bg-white dark:bg-zinc-800 border-none rounded-xl px-4 py-4 focus:ring-2 focus:ring-[#006b2c]/20 text-[#1a1b22] dark:text-zinc-50 placeholder:text-[#6e7b6c] dark:placeholder:text-zinc-500 transition-all"
                            placeholder="••••••••"
                        />
                        <p className="mt-2 text-xs text-[#6e7b6c] dark:text-zinc-500 ml-1">Minimum 8 characters</p>
                    </div>

                    {role === "tenant" && (
                        <>
                            <div>
                                <label htmlFor="nin" className="block text-xs font-mono uppercase tracking-[0.2em] text-[#3e4a3d] dark:text-zinc-400 mb-2 ml-1">
                                    NIN (11 Digits)
                                </label>
                                <input
                                    id="nin"
                                    type="text"
                                    required
                                    inputMode="numeric"
                                    maxLength={11}
                                    value={nin}
                                    onChange={(e) => setNin(e.target.value.replace(/\D/g, "").slice(0, 11))}
                                    className="w-full bg-white dark:bg-zinc-800 border-none rounded-xl px-4 py-4 focus:ring-2 focus:ring-[#006b2c]/20 text-[#1a1b22] dark:text-zinc-50 placeholder:text-[#6e7b6c] dark:placeholder:text-zinc-500 transition-all"
                                    placeholder="e.g., 12345678901"
                                />
                            </div>

                            <div>
                                <label htmlFor="bvn" className="block text-xs font-mono uppercase tracking-[0.2em] text-[#3e4a3d] dark:text-zinc-400 mb-2 ml-1">
                                    BVN (11 Digits)
                                </label>
                                <input
                                    id="bvn"
                                    type="text"
                                    required
                                    inputMode="numeric"
                                    maxLength={11}
                                    value={bvn}
                                    onChange={(e) => setBvn(e.target.value.replace(/\D/g, "").slice(0, 11))}
                                    className="w-full bg-white dark:bg-zinc-800 border-none rounded-xl px-4 py-4 focus:ring-2 focus:ring-[#006b2c]/20 text-[#1a1b22] dark:text-zinc-50 placeholder:text-[#6e7b6c] dark:placeholder:text-zinc-500 transition-all"
                                    placeholder="e.g., 12345678901"
                                />
                            </div>

                            <div>
                                <label htmlFor="governmentIdType" className="block text-xs font-mono uppercase tracking-[0.2em] text-[#3e4a3d] dark:text-zinc-400 mb-2 ml-1">
                                    Government ID Type (Optional)
                                </label>
                                <select
                                    id="governmentIdType"
                                    value={governmentIdType}
                                    onChange={(e) => setGovernmentIdType(e.target.value as GovernmentIdType)}
                                    className="w-full bg-white dark:bg-zinc-800 border-none rounded-xl px-4 py-4 focus:ring-2 focus:ring-[#006b2c]/20 text-[#1a1b22] dark:text-zinc-50 transition-all"
                                >
                                    {Object.entries(GOVERNMENT_ID_LABELS).map(([value, label]) => (
                                        <option key={value} value={value}>{label}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label htmlFor="governmentIdNumber" className="block text-xs font-mono uppercase tracking-[0.2em] text-[#3e4a3d] dark:text-zinc-400 mb-2 ml-1">
                                    Government ID Number (Optional)
                                </label>
                                <input
                                    id="governmentIdNumber"
                                    type="text"
                                    value={governmentIdNumber}
                                    onChange={(e) => setGovernmentIdNumber(e.target.value)}
                                    className="w-full bg-white dark:bg-zinc-800 border-none rounded-xl px-4 py-4 focus:ring-2 focus:ring-[#006b2c]/20 text-[#1a1b22] dark:text-zinc-50 placeholder:text-[#6e7b6c] dark:placeholder:text-zinc-500 transition-all"
                                    placeholder="Enter ID number exactly as shown"
                                />
                                <p className="mt-2 text-xs text-[#6e7b6c] dark:text-zinc-500 ml-1">Optional for now. NIN and BVN remain mandatory.</p>
                            </div>
                        </>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-4 rounded-xl btn-primary-gradient text-white font-bold tracking-tight shadow-lg shadow-[#006b2c]/10 hover:scale-[1.01] active:scale-[0.98] transition-all disabled:opacity-50"
                    >
                        {loading ? "Creating account..." : "Create Account"}
                    </button>
                </form>

                <p className="text-center mt-10 text-[#3e4a3d] dark:text-zinc-400 text-sm">
                    Already have an account?
                    <Link href="/login" className="text-[#006b2c] dark:text-emerald-400 font-bold ml-1 hover:underline underline-offset-4">
                        Sign in
                    </Link>
                </p>
            </div>
        </div>
    );
}
