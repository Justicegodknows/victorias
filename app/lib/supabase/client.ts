"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/app/lib/types";

export function createSupabaseBrowser(): ReturnType<
    typeof createBrowserClient<Database>
> {
    return createBrowserClient<Database>(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    );
}
