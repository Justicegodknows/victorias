"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/app/lib/types";
import {
    getSupabaseBrowserConfig,
    getSupabaseBrowserConfigError,
} from "@/app/lib/supabase/public-env";

export type SupabaseBrowserClient = ReturnType<
    typeof createBrowserClient<Database>
>;

export function createSupabaseBrowser(): SupabaseBrowserClient {
    const { url, publishableKey } = getSupabaseBrowserConfig();

    return createBrowserClient<Database>(url, publishableKey);
}

export function tryCreateSupabaseBrowser(): {
    client: SupabaseBrowserClient | null;
    error: string | null;
} {
    const configError = getSupabaseBrowserConfigError();

    if (configError) {
        return {
            client: null,
            error: configError,
        };
    }

    return {
        client: createSupabaseBrowser(),
        error: null,
    };
}
