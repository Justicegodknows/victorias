import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";
import {
    getSupabasePublishableKey,
    getSupabaseUrl,
} from "@/app/lib/supabase/public-env";

export async function updateSession(request: NextRequest): Promise<NextResponse> {
    let response = NextResponse.next({ request });

    const supabase = createServerClient(
        getSupabaseUrl(),
        getSupabasePublishableKey(),
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll();
                },
                setAll(cookiesToSet) {
                    for (const { name, value } of cookiesToSet) {
                        request.cookies.set(name, value);
                    }
                    response = NextResponse.next({ request });
                    for (const { name, value, options } of cookiesToSet) {
                        response.cookies.set(name, value, options);
                    }
                },
            },
        },
    );

    const {
        data: { user },
    } = await supabase.auth.getUser();

    const isAuthRoute = request.nextUrl.pathname.startsWith("/login") ||
        request.nextUrl.pathname.startsWith("/register");
    const isDashboardRoute = request.nextUrl.pathname.startsWith("/landlord") ||
        request.nextUrl.pathname.startsWith("/tenant");

    // Redirect unauthenticated users away from dashboard routes
    if (!user && isDashboardRoute) {
        const url = request.nextUrl.clone();
        url.pathname = "/login";
        return NextResponse.redirect(url);
    }

    // Redirect authenticated users away from auth routes
    if (user && isAuthRoute) {
        const url = request.nextUrl.clone();
        url.pathname = "/tenant";
        return NextResponse.redirect(url);
    }

    return response;
}
