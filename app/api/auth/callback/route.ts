import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import {
    getSupabasePublishableKey,
    getSupabaseUrl,
} from "@/app/lib/supabase/public-env";

export async function GET(request: Request): Promise<NextResponse> {
    const { searchParams, origin } = new URL(request.url);
    const code = searchParams.get("code");
    const next = searchParams.get("next");

    if (code) {
        const cookieStore = await cookies();

        const supabase = createServerClient(
            getSupabaseUrl(),
            getSupabasePublishableKey(),
            {
                cookies: {
                    getAll() {
                        return cookieStore.getAll();
                    },
                    setAll(cookiesToSet) {
                        for (const { name, value, options } of cookiesToSet) {
                            cookieStore.set(name, value, options);
                        }
                    },
                },
            },
        );

        const { error } = await supabase.auth.exchangeCodeForSession(code);

        if (!error) {
            if (next?.startsWith("/") && !next.startsWith("//")) {
                return NextResponse.redirect(`${origin}${next}`);
            }

            const {
                data: { user },
            } = await supabase.auth.getUser();

            if (!user) {
                return NextResponse.redirect(`${origin}/tenant/browse`);
            }

            const { data: profile } = await supabase
                .from("profiles")
                .select("role")
                .eq("id", user.id)
                .maybeSingle()
                .overrideTypes<{ role: "tenant" | "landlord" }, { merge: false }>();

            const redirectPath = profile?.role === "landlord" ? "/landlord" : "/tenant/browse";
            return NextResponse.redirect(`${origin}${redirectPath}`);
        }
    }

    return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`);
}