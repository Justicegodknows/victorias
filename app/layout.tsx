import type { Metadata } from "next";
import { Geist, Geist_Mono, Inter, Manrope } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";

const inter = Inter({ subsets: ['latin'], variable: '--font-sans' });

const manrope = Manrope({ subsets: ['latin'], variable: '--font-manrope' });

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Victoria's — AI-Powered Apartment Finder in Nigeria",
  description:
    "Find your perfect apartment in Lagos, Abuja, and Port Harcourt. AI-powered search with honest neighborhood insights, affordability checks, and true cost breakdowns.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={cn("h-full", "antialiased", geistSans.variable, geistMono.variable, "font-sans", inter.variable, manrope.variable)}
    >
      <body className="min-h-full flex flex-col bg-[#fbf8ff] text-[#1a1b22] dark:bg-zinc-950 dark:text-zinc-50">
        {children}
      </body>
    </html>
  );
}
