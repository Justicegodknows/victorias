"use client";

import { useState } from "react";
import { createSupabaseBrowser } from "@/app/lib/supabase/client";
import Link from "next/link";
import type { UserRole } from "@/app/lib/types";

export default function RegisterPage(): React.ReactElement {
    const [fullName, setFullName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [role, setRole] = useState<UserRole>("tenant");
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);

    const supabase = createSupabaseBrowser();

    async function handleRegister(e: React.FormEvent): Promise<void> {
        e.preventDefault();
        setError(null);
        setLoading(true);

        const { error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    full_name: fullName,
                    role,
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
            <div className="space-y-4 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-100 dark:bg-green-900">
                    <svg className="h-6 w-6 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                    </svg>
                </div>
                <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
                    Check your email
                </h2>
                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                    We sent a confirmation link to <strong>{email}</strong>. Click the link to activate your account.
                </p>
                <Link
                    href="/login"
                    className="inline-block text-sm font-medium text-green-600 hover:text-green-500"
                >
                    Back to login
                </Link>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="text-center">
                <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
                    Create your account
                </h1>
                <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                    Join Victoria&apos;s to find or list apartments
                </p>
            </div>

            {error && (
                <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
                    {error}
                </div>
            )}

            <form onSubmit={handleRegister} className="space-y-4">
                {/* Role selection */}
                <fieldset>
                    <legend className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                        I want to
                    </legend>
                    <div className="mt-2 flex gap-3">
                        <label
                            className={`flex flex-1 cursor-pointer items-center justify-center rounded-lg border-2 px-4 py-3 text-sm font-medium transition-colors ${role === "tenant"
                                    ? "border-green-600 bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-400"
                                    : "border-zinc-200 text-zinc-600 hover:border-zinc-300 dark:border-zinc-700 dark:text-zinc-400"
                                }`}
                        >
                            <input
                                type="radio"
                                name="role"
                                value="tenant"
                                checked={role === "tenant"}
                                onChange={() => setRole("tenant")}
                                className="sr-only"
                            />
                            Find an apartment
                        </label>
                        <label
                            className={`flex flex-1 cursor-pointer items-center justify-center rounded-lg border-2 px-4 py-3 text-sm font-medium transition-colors ${role === "landlord"
                                    ? "border-green-600 bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-400"
                                    : "border-zinc-200 text-zinc-600 hover:border-zinc-300 dark:border-zinc-700 dark:text-zinc-400"
                                }`}
                        >
                            <input
                                type="radio"
                                name="role"
                                value="landlord"
                                checked={role === "landlord"}
                                onChange={() => setRole("landlord")}
                                className="sr-only"
                            />
                            List apartments
                        </label>
                    </div>
                </fieldset>

                <div>
                    <label htmlFor="fullName" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                        Full Name
                    </label>
                    <input
                        id="fullName"
                        type="text"
                        required
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        className="mt-1 block w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm shadow-sm focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-50"
                        placeholder="Adaeze Okafor"
                    />
                </div>

                <div>
                    <label htmlFor="registerEmail" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                        Email
                    </label>
                    <input
                        id="registerEmail"
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="mt-1 block w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm shadow-sm focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-50"
                        placeholder="you@example.com"
                    />
                </div>

                <div>
                    <label htmlFor="registerPassword" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                        Password
                    </label>
                    <input
                        id="registerPassword"
                        type="password"
                        required
                        minLength={8}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="mt-1 block w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm shadow-sm focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-50"
                        placeholder="••••••••"
                    />
                    <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-500">Minimum 8 characters</p>
                </div>

                <button
                    type="submit"
                    disabled={loading}
                    className="w-full rounded-lg bg-green-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50"
                >
                    {loading ? "Creating account..." : "Create account"}
                </button>
            </form>

            <p className="text-center text-sm text-zinc-600 dark:text-zinc-400">
                Already have an account?{" "}
                <Link href="/login" className="font-medium text-green-600 hover:text-green-500">
                    Sign in
                </Link>
            </p>
        </div>
    );
}
