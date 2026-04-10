export function getSupabaseUrl(): string {
    // Static reference required for Next.js build-time inlining of NEXT_PUBLIC_ vars
    const value = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
    if (value) return value;
    throw new Error("Missing Supabase project URL. Set NEXT_PUBLIC_SUPABASE_URL");
}

export function getSupabasePublishableKey(): string {
    // Static references required for Next.js build-time inlining of NEXT_PUBLIC_ vars
    const value =
        process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() ||
        process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY?.trim();
    if (value) return value;
    throw new Error(
        "Missing Supabase publishable key. Set NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
    );
}