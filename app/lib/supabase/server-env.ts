import "server-only";

import { getSupabaseUrl } from "@/app/lib/supabase/public-env";

function readRequiredServerEnv(name: string, label: string): string {
    const value = process.env[name]?.trim();

    if (!value) {
        throw new Error(`Missing ${label}. Set ${name}`);
    }

    return value;
}

export { getSupabaseUrl };

export function getSupabaseServiceRoleKey(): string {
    return readRequiredServerEnv(
        "SUPABASE_SERVICE_ROLE_KEY",
        "Supabase service role key",
    );
}