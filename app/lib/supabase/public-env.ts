function readRequiredEnv(names: readonly string[], label: string): string {
    for (const name of names) {
        const value = process.env[name]?.trim();

        if (value) {
            return value;
        }
    }

    throw new Error(`Missing ${label}. Set one of: ${names.join(", ")}`);
}

export function getSupabaseUrl(): string {
    return readRequiredEnv(["NEXT_PUBLIC_SUPABASE_URL"], "Supabase project URL");
}

export function getSupabasePublishableKey(): string {
    return readRequiredEnv(
        [
            "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
            "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY",
        ],
        "Supabase publishable key",
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