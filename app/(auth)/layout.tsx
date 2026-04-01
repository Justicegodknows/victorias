import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
    title: "Login — Victoria's",
    description: "Sign in to find your perfect apartment in Nigeria",
};

export default function AuthLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>): React.ReactElement {
    return (
        <div className="relative flex min-h-full flex-1 flex-col items-center justify-center bg-[#fbf8ff] dark:bg-zinc-950 px-4 py-8 md:py-12">
            {/* Background blurs */}
            <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] left-[-5%] w-[40%] h-[40%] bg-[#006b2c]/5 rounded-full blur-[120px]" />
                <div className="absolute bottom-[-10%] right-[-5%] w-[30%] h-[30%] bg-[#3b6842]/5 rounded-full blur-[100px]" />
            </div>

            {/* Brand */}
            <div className="text-center mb-12">
                <Link href="/" className="font-[family-name:var(--font-geist-sans)] text-4xl font-black tracking-tighter text-[#006b2c] dark:text-emerald-400">
                    Victoria&apos;s
                </Link>
                <p className="text-[#3e4a3d] dark:text-zinc-400 font-medium tracking-tight mt-2">
                    Experience curated premium living.
                </p>
            </div>

            <div className="w-full max-w-lg">{children}</div>

            {/* Trust badges */}
            <footer className="mt-20 w-full max-w-4xl border-t border-[#bdcaba]/10 pt-8 flex flex-col md:flex-row justify-between items-center gap-6 opacity-60 hover:opacity-100 transition-opacity">
                <div className="flex items-center gap-2">
                    <span className="text-[#006b2c]">🛡️</span>
                    <span className="text-xs font-[family-name:var(--font-geist-mono)] uppercase tracking-[0.2em]">Bank-Grade Security</span>
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-[#006b2c]">⚡</span>
                    <span className="text-xs font-[family-name:var(--font-geist-mono)] uppercase tracking-[0.2em]">AI Concierge Powered</span>
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-[#006b2c]">🏆</span>
                    <span className="text-xs font-[family-name:var(--font-geist-mono)] uppercase tracking-[0.2em]">Premium Curator Service</span>
                </div>
            </footer>

            {/* Bottom gradient line */}
            <div className="fixed bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[#006b2c]/20 to-transparent" />
        </div>
    );
}
