"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/app/lib/types";

export type SupabaseBrowserClient = ReturnType<
    typeof createBrowserClient<Database>
>;

export type SupabaseBrowserConfig = {
    url: string;
    publishableKey: string;
};

function getBrowserSupabaseUrl(): string {
    const value = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();

    if (value) {
        return value;
    }

    throw new Error("Missing Supabase project URL. Set NEXT_PUBLIC_SUPABASE_URL");
}

function getBrowserSupabasePublishableKey(): string {
    const primaryValue = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();
    if (primaryValue) {
        return primaryValue;
    }

    const legacyValue = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY?.trim();
    if (legacyValue) {
        return legacyValue;
    }

    throw new Error(
        "Missing Supabase publishable key. Set one of: NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY",
    );
}

function getSupabaseBrowserConfig(): SupabaseBrowserConfig {
    return {
        url: getBrowserSupabaseUrl(),
        publishableKey: getBrowserSupabasePublishableKey(),
    };
}

function getSupabaseBrowserConfigError(): string | null {
    try {
        getSupabaseBrowserConfig();
        return null;
    } catch (error) {
        if (error instanceof Error) {
            return error.message;
        }

        return "Supabase auth is unavailable due to missing public configuration.";
    }
}

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
