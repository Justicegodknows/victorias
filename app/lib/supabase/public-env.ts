export function getSupabaseUrl(): string {
    // Keep this as a static property access so Next.js inlines it for client code.
    const value = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();

    if (value) {
        return value;
    }

    throw new Error("Missing Supabase project URL. Set NEXT_PUBLIC_SUPABASE_URL");
}

export function getSupabasePublishableKey(): string {
    // Keep these as static property accesses so Next.js inlines them for client code.
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

export type SupabaseBrowserConfig = {
    url: string;
    publishableKey: string;
};

export function getSupabaseBrowserConfig(): SupabaseBrowserConfig {
    return {
        url: getSupabaseUrl(),
        publishableKey: getSupabasePublishableKey(),
    };
}

export function getSupabaseBrowserConfigError(): string | null {
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