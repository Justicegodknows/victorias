import type { Metadata } from "next";

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
        <div className="flex min-h-full flex-1 flex-col items-center justify-center bg-zinc-50 px-4 dark:bg-zinc-950">
            <div className="w-full max-w-sm">{children}</div>
        </div>
    );
}
