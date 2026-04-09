"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/app/lib/types";
import {
    getSupabasePublishableKey,
    getSupabaseUrl,
} from "@/app/lib/supabase/public-env";

export function createSupabaseBrowser(): ReturnType<
    typeof createBrowserClient<Database>
> {
    return createBrowserClient<Database>(
        getSupabaseUrl(),
        getSupabasePublishableKey(),
    );
}
