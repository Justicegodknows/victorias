"use client";

import { useState } from "react";
import Link from "next/link";
import type { GovernmentIdType, UserRole } from "@/app/lib/types";
import { tryCreateSupabaseBrowser } from "@/app/lib/supabase/client";

const GOVERNMENT_ID_LABELS: Record<GovernmentIdType, string> = {
    "national-id-card": "National ID Card",
    "drivers-license": "Driver's License",
    "international-passport": "International Passport",
    "voters-card": "Voter's Card",
};

function normalizePhoneNumber(value: string): string | null {
    const trimmed = value.trim();
    const digits = trimmed.replace(/\D/g, "");

    if (digits.length < 10 || digits.length > 15) {
        return null;
    }

    if (trimmed.startsWith("+")) {
        return `+${digits}`;
    }

    if (digits.length === 11 && digits.startsWith("0")) {
        return `+234${digits.slice(1)}`;
    }

    return `+${digits}`;
}

export default function RegisterPage(): React.ReactElement {
    const [fullName, setFullName] = useState("");
    const [email, setEmail] = useState("");
    const [phone, setPhone] = useState("");
    const [password, setPassword] = useState("");
    const [role, setRole] = useState<UserRole>("tenant");
    const [nin, setNin] = useState("");
    const [bvn, setBvn] = useState("");
    const [governmentIdType, setGovernmentIdType] = useState<GovernmentIdType>("national-id-card");
    const [governmentIdNumber, setGovernmentIdNumber] = useState("");
    const [agentCode, setAgentCode] = useState("");
    const [agentName, setAgentName] = useState<string | null>(null);
    const [agentCodeChecking, setAgentCodeChecking] = useState(false);
    const [agentCodeValid, setAgentCodeValid] = useState<boolean | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);

    const [{ client: supabase, error: supabaseError }] = useState(() =>
        tryCreateSupabaseBrowser(),
    );
    const activeError = error ?? supabaseError;
    const authUnavailable = !supabase;

    async function handleAgentCodeBlur(): Promise<void> {
        const code = agentCode.trim().toUpperCase();
        if (!code) {
            setAgentCodeValid(null);
            setAgentName(null);
            return;
        }
        setAgentCodeChecking(true);
        try {
            const res = await fetch(`/api/agents/validate?code=${encodeURIComponent(code)}`);
            const json = (await res.json()) as { valid: boolean; agent_name?: string };
            setAgentCodeValid(json.valid);
            setAgentName(json.valid ? (json.agent_name ?? null) : null);
        } catch {
            setAgentCodeValid(null);
        } finally {
            setAgentCodeChecking(false);
        }
    }

    function handleGoogleSignUp(): void {
        setError("Phone number is mandatory for registration. Use the form above to continue.");
    }


    async function handleRegister(e: React.FormEvent): Promise<void> {
        e.preventDefault();

        if (!supabase) {
            setError(supabaseError ?? "Supabase auth is unavailable.");
            return;
        }

        setError(null);

        const normalizedPhone = normalizePhoneNumber(phone);
        if (!normalizedPhone) {
            setError("Enter a valid phone number with 10 to 15 digits.");
            return;
        }

        if (role === "landlord") {
            const code = agentCode.trim().toUpperCase();
            if (!code) {
                setError("Agent code is required to register as a landlord.");
                return;
            }
            if (agentCodeValid !== true) {
                setError("Invalid agent code. Please verify the code your agent gave you.");
                return;
            }
        }

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
                    phone: normalizedPhone,
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
                    agent_code: role === "landlord" ? agentCode.trim().toUpperCase() : null,
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
            <div className="bg-[#f8efe7] dark:bg-zinc-900 rounded-[2rem] p-8 md:p-12 ambient-shadow text-center space-y-4">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#f3ddc8] dark:bg-amber-900">
                    <span className="text-3xl">✓</span>
                </div>
                <h2 className="font-(family-name:--font-manrope) text-xl font-bold text-[#2a221d] dark:text-zinc-50">
                    Check your email
                </h2>
                <p className="text-sm text-[#6a5e54] dark:text-zinc-400">
                    We sent a confirmation link to <strong className="text-[#7b5d43] dark:text-amber-400">{email}</strong>. Click the link to activate your account.
                </p>
                <Link
                    href="/login"
                    className="inline-block text-sm font-bold text-[#7b5d43] dark:text-amber-400 hover:underline underline-offset-4"
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
                    <p className="text-[#6a5e54] dark:text-zinc-400 mt-1">Get started with the curator.</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <button
                        type="button"
                        onClick={() => setRole("tenant")}
                        className={`group cursor-pointer p-6 rounded-3xl ambient-shadow transition-all relative overflow-hidden text-left ${role === "tenant"
                            ? "bg-[#7b5d43]/5 dark:bg-amber-900/20 ring-2 ring-[#7b5d43] dark:ring-amber-400"
                            : "bg-[#f8efe7] dark:bg-zinc-900 hover:bg-[#7b5d43]/5 dark:hover:bg-zinc-800"
                            }`}
                    >
                        <div className="mb-4 w-12 h-12 rounded-2xl bg-[#f3ddc8] dark:bg-amber-900 flex items-center justify-center">
                            <span className="text-2xl">🏠</span>
                        </div>
                        <h3 className="font-bold text-lg mb-1 dark:text-zinc-50">Tenant</h3>
                        <p className="text-xs text-[#6a5e54] dark:text-zinc-400 leading-relaxed">Find your dream home with AI assistance.</p>
                        {role === "tenant" && (
                            <div className="absolute top-2 right-2">
                                <span className="text-[#7b5d43] dark:text-amber-400">✓</span>
                            </div>
                        )}
                    </button>
                    <button
                        type="button"
                        onClick={() => setRole("landlord")}
                        className={`group cursor-pointer p-6 rounded-3xl ambient-shadow transition-all relative overflow-hidden text-left ${role === "landlord"
                            ? "bg-[#7b5d43]/5 dark:bg-amber-900/20 ring-2 ring-[#7b5d43] dark:ring-amber-400"
                            : "bg-[#f8efe7] dark:bg-zinc-900 hover:bg-[#7b5d43]/5 dark:hover:bg-zinc-800"
                            }`}
                    >
                        <div className="mb-4 w-12 h-12 rounded-2xl bg-[#d78f45] flex items-center justify-center">
                            <span className="text-2xl">🏢</span>
                        </div>
                        <h3 className="font-bold text-lg mb-1 dark:text-zinc-50">Landlord</h3>
                        <p className="text-xs text-[#6a5e54] dark:text-zinc-400 leading-relaxed">List and manage your premium assets.</p>
                        {role === "landlord" && (
                            <div className="absolute top-2 right-2">
                                <span className="text-[#7b5d43] dark:text-amber-400">✓</span>
                            </div>
                        )}
                    </button>
                    <button
                        type="button"
                        onClick={() => setRole("agent")}
                        className={`group cursor-pointer p-6 rounded-3xl ambient-shadow transition-all relative overflow-hidden text-left ${role === "agent"
                            ? "bg-[#7b5d43]/5 dark:bg-amber-900/20 ring-2 ring-[#7b5d43] dark:ring-amber-400"
                            : "bg-[#f8efe7] dark:bg-zinc-900 hover:bg-[#7b5d43]/5 dark:hover:bg-zinc-800"
                            }`}
                    >
                        <div className="mb-4 w-12 h-12 rounded-2xl bg-[#3b6842]/20 dark:bg-[#3b6842]/40 flex items-center justify-center">
                            <span className="text-2xl">🤝</span>
                        </div>
                        <h3 className="font-bold text-lg mb-1 dark:text-zinc-50">Agent</h3>
                        <p className="text-xs text-[#6a5e54] dark:text-zinc-400 leading-relaxed">Manage landlords under your agency.</p>
                        {role === "agent" && (
                            <div className="absolute top-2 right-2">
                                <span className="text-[#7b5d43] dark:text-amber-400">✓</span>
                            </div>
                        )}
                    </button>
                </div>
            </div>

            {/* Registration Card */}
            <div className="bg-[#f8efe7] dark:bg-zinc-900 rounded-[2rem] p-8 md:p-12 ambient-shadow relative overflow-hidden">
                {activeError && (
                    <div className="rounded-xl bg-[#ffdad6] dark:bg-red-950 p-4 text-sm text-[#93000a] dark:text-red-300 mb-6">
                        {activeError}
                    </div>
                )}

                <form onSubmit={handleRegister} className="space-y-6">
                    <div>
                        <label htmlFor="fullName" className="block text-xs font-mono uppercase tracking-[0.2em] text-[#6a5e54] dark:text-zinc-400 mb-2 ml-1">
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
                            placeholder="Adaeze Okafor"
                        />
                    </div>

                    <div>
                        <label htmlFor="registerEmail" className="block text-xs font-mono uppercase tracking-[0.2em] text-[#6a5e54] dark:text-zinc-400 mb-2 ml-1">
                            Email Address
                        </label>
                        <input
                            id="registerEmail"
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
                            placeholder="+2348012345678"
                        />
                        <p className="mt-2 text-xs text-[#6e7b6c] dark:text-zinc-500 ml-1">Use your active number for account verification and contact.</p>
                    </div>

                    <div>
                        <label htmlFor="registerPassword" className="block text-xs font-mono uppercase tracking-[0.2em] text-[#6a5e54] dark:text-zinc-400 mb-2 ml-1">
                            Password
                        </label>
                        <input
                            id="registerPassword"
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

                    {role === "tenant" && (
                        <>
                            <div>
                                <label htmlFor="nin" className="block text-xs font-mono uppercase tracking-[0.2em] text-[#6a5e54] dark:text-zinc-400 mb-2 ml-1">
                                    NIN (11 Digits)
                                </label>
                                <input
                                    id="nin"
                                    type="text"
                                    required
                                    inputMode="numeric"
                                    maxLength={11}
                                    disabled={authUnavailable || loading}
                                    value={nin}
                                    onChange={(e) => setNin(e.target.value.replace(/\D/g, "").slice(0, 11))}
                                    className="w-full bg-white dark:bg-zinc-800 border-none rounded-xl px-4 py-4 focus:ring-2 focus:ring-[#7b5d43]/20 text-[#2a221d] dark:text-zinc-50 placeholder:text-[#6e7b6c] dark:placeholder:text-zinc-500 transition-all"
                                    placeholder="e.g., 12345678901"
                                />
                            </div>

                            <div>
                                <label htmlFor="bvn" className="block text-xs font-mono uppercase tracking-[0.2em] text-[#6a5e54] dark:text-zinc-400 mb-2 ml-1">
                                    BVN (11 Digits)
                                </label>
                                <input
                                    id="bvn"
                                    type="text"
                                    required
                                    inputMode="numeric"
                                    maxLength={11}
                                    disabled={authUnavailable || loading}
                                    value={bvn}
                                    onChange={(e) => setBvn(e.target.value.replace(/\D/g, "").slice(0, 11))}
                                    className="w-full bg-white dark:bg-zinc-800 border-none rounded-xl px-4 py-4 focus:ring-2 focus:ring-[#7b5d43]/20 text-[#2a221d] dark:text-zinc-50 placeholder:text-[#6e7b6c] dark:placeholder:text-zinc-500 transition-all"
                                    placeholder="e.g., 12345678901"
                                />
                            </div>

                            <div>
                                <label htmlFor="governmentIdType" className="block text-xs font-mono uppercase tracking-[0.2em] text-[#6a5e54] dark:text-zinc-400 mb-2 ml-1">
                                    Government ID Type (Optional)
                                </label>
                                <select
                                    id="governmentIdType"
                                    value={governmentIdType}
                                    onChange={(e) => setGovernmentIdType(e.target.value as GovernmentIdType)}
                                    disabled={authUnavailable || loading}
                                    className="w-full bg-white dark:bg-zinc-800 border-none rounded-xl px-4 py-4 focus:ring-2 focus:ring-[#7b5d43]/20 text-[#2a221d] dark:text-zinc-50 transition-all"
                                >
                                    {Object.entries(GOVERNMENT_ID_LABELS).map(([value, label]) => (
                                        <option key={value} value={value}>{label}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label htmlFor="governmentIdNumber" className="block text-xs font-mono uppercase tracking-[0.2em] text-[#6a5e54] dark:text-zinc-400 mb-2 ml-1">
                                    Government ID Number (Optional)
                                </label>
                                <input
                                    id="governmentIdNumber"
                                    type="text"
                                    disabled={authUnavailable || loading}
                                    value={governmentIdNumber}
                                    onChange={(e) => setGovernmentIdNumber(e.target.value)}
                                    className="w-full bg-white dark:bg-zinc-800 border-none rounded-xl px-4 py-4 focus:ring-2 focus:ring-[#7b5d43]/20 text-[#2a221d] dark:text-zinc-50 placeholder:text-[#6e7b6c] dark:placeholder:text-zinc-500 transition-all"
                                    placeholder="Enter ID number exactly as shown"
                                />
                                <p className="mt-2 text-xs text-[#6e7b6c] dark:text-zinc-500 ml-1">Optional for now. NIN and BVN remain mandatory.</p>
                            </div>
                        </>
                    )}

                    {role === "landlord" && (
                        <div>
                            <label htmlFor="agentCode" className="block text-xs font-mono uppercase tracking-[0.2em] text-[#6a5e54] dark:text-zinc-400 mb-2 ml-1">
                                Agent Code <span className="text-red-500">*</span>
                            </label>
                            <input
                                id="agentCode"
                                type="text"
                                required
                                disabled={authUnavailable || loading}
                                value={agentCode}
                                onChange={(e) => {
                                    setAgentCode(e.target.value.toUpperCase());
                                    setAgentCodeValid(null);
                                    setAgentName(null);
                                }}
                                onBlur={handleAgentCodeBlur}
                                className={`w-full bg-white dark:bg-zinc-800 border-none rounded-xl px-4 py-4 focus:ring-2 text-[#2a221d] dark:text-zinc-50 placeholder:text-[#6e7b6c] dark:placeholder:text-zinc-500 transition-all font-mono tracking-widest ${agentCodeValid === true
                                    ? "ring-2 ring-green-500/40"
                                    : agentCodeValid === false
                                        ? "ring-2 ring-red-400/40"
                                        : "focus:ring-[#7b5d43]/20"
                                    }`}
                                placeholder="AGT-XXXXXXXX"
                            />
                            {agentCodeChecking && (
                                <p className="mt-2 text-xs text-[#6e7b6c] dark:text-zinc-500 ml-1">Verifying code…</p>
                            )}
                            {agentCodeValid === true && agentName && (
                                <p className="mt-2 text-xs text-green-600 dark:text-green-400 ml-1">
                                    ✓ Valid — Agent: <strong>{agentName}</strong>
                                </p>
                            )}
                            {agentCodeValid === false && (
                                <p className="mt-2 text-xs text-red-500 dark:text-red-400 ml-1">
                                    ✗ Invalid agent code. Ask your agent for the correct code.
                                </p>
                            )}
                            {agentCodeValid === null && !agentCodeChecking && (
                                <p className="mt-2 text-xs text-[#6e7b6c] dark:text-zinc-500 ml-1">
                                    Required. Get this code from your agent.
                                </p>
                            )}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={authUnavailable || loading}
                        className="w-full py-4 rounded-xl btn-primary-gradient text-white font-bold tracking-tight shadow-lg shadow-[#7b5d43]/10 hover:scale-[1.01] active:scale-[0.98] transition-all disabled:opacity-50"
                    >
                        {loading ? "Creating account..." : "Create Account"}
                    </button>
                </form>

                <p className="text-center mt-10 text-[#6a5e54] dark:text-zinc-400 text-sm">
                    Already have an account?
                    <Link href="/login" className="text-[#7b5d43] dark:text-amber-400 font-bold ml-1 hover:underline underline-offset-4">
                        Sign in
                    </Link>
                </p>
            </div>
            <div className="relative my-10">
                <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-[#bdcaba]/30" />
                </div>
                <div className="relative flex justify-center text-xs uppercase font-mono tracking-[0.2em]">
                    <span className="bg-[#f8efe7] dark:bg-zinc-900 px-4 text-[#6e7b6c] dark:text-zinc-500">
                        Or sign up with
                    </span>
                </div>
            </div>

            <button
                type="button"
                onClick={handleGoogleSignUp}
                disabled={authUnavailable || loading}
                className="w-full flex items-center justify-center gap-3 py-4 rounded-xl bg-[#efe0d2] dark:bg-zinc-800 text-[#6a5e54] dark:text-zinc-400 font-medium hover:bg-[#e8e7f1] dark:hover:bg-zinc-700 transition-colors disabled:opacity-50"
            >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                </svg>
                Continue with Google
            </button>

        </div>
    );
}
