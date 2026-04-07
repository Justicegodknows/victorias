"use client";

import { useEffect } from "react";

export default function DashboardError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}): React.ReactElement {
    useEffect(() => {
        console.error("[Dashboard] Runtime error:", error);
    }, [error]);

    return (
        <div className="mx-auto flex min-h-[60vh] max-w-lg flex-col items-center justify-center text-center p-8">
            <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-red-100 dark:bg-red-950">
                <span className="text-3xl">⚠</span>
            </div>
            <h2 className="font-(family-name:--font-geist-sans) text-xl font-bold text-[#1a1b22] dark:text-zinc-50 mb-2">
                Something went wrong
            </h2>
            <p className="text-sm text-[#3e4a3d] dark:text-zinc-400 mb-6">
                An unexpected error occurred. Please try again or refresh the page.
            </p>
            <button
                type="button"
                onClick={reset}
                className="rounded-2xl bg-[#006b2c] px-6 py-3 text-sm font-bold text-white shadow-lg transition-transform hover:bg-[#00873a] active:scale-95"
            >
                Try Again
            </button>
        </div>
    );
}
