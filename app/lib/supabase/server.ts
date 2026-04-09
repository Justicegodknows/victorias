import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "@/app/lib/types";
import {
    getSupabasePublishableKey,
    getSupabaseUrl,
} from "@/app/lib/supabase/public-env";

export async function createSupabaseServer(): Promise<
    ReturnType<typeof createServerClient<Database>>
> {
    const cookieStore = await cookies();

    return createServerClient<Database>(
        getSupabaseUrl(),
        getSupabasePublishableKey(),
        {
            cookies: {
                getAll() {
                    return cookieStore.getAll();
                },
                setAll(cookiesToSet) {
                    try {
                        for (const { name, value, options } of cookiesToSet) {
                            cookieStore.set(name, value, options);
                        }
                    } catch {
                        // setAll is called from Server Components where cookies cannot
                        // be set. This can safely be ignored when the middleware is
                        // refreshing the session.
                    }
                },
            },
        },
    );
}
