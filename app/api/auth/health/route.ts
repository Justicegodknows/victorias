import { NextResponse } from "next/server";

type AuthHealthPayload = {
    ok: boolean;
    authConfigured: boolean;
    missing: string[];
    checks: {
        supabaseUrl: boolean;
        supabasePublishableKey: boolean;
        supabaseServiceRoleKey: boolean;
        appUrl: boolean;
    };
};

function isAuthorizedByKey(req: Request): boolean {
    const configured = process.env.AUTH_HEALTH_KEY?.trim();

    if (!configured) {
        return false;
    }

    const provided = req.headers.get("x-auth-health-key");
    return Boolean(provided && provided === configured);
}

function hasEnv(name: string): boolean {
    return Boolean(process.env[name]?.trim());
}

function getAuthHealthPayload(): AuthHealthPayload {
    const checks = {
        supabaseUrl: hasEnv("NEXT_PUBLIC_SUPABASE_URL"),
        supabasePublishableKey: hasEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"),
        supabaseServiceRoleKey: hasEnv("SUPABASE_SERVICE_ROLE_KEY"),
        appUrl: hasEnv("NEXT_PUBLIC_APP_URL"),
    };

    const missing = [
        !checks.supabaseUrl ? "NEXT_PUBLIC_SUPABASE_URL" : null,
        !checks.supabasePublishableKey
            ? "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"
            : null,
        !checks.supabaseServiceRoleKey ? "SUPABASE_SERVICE_ROLE_KEY" : null,
        !checks.appUrl ? "NEXT_PUBLIC_APP_URL" : null,
    ].filter((value): value is string => value !== null);

    return {
        ok: missing.length === 0,
        authConfigured: missing.length === 0,
        missing,
        checks,
    };
}

export async function GET(req: Request): Promise<Response> {
    if (!isAuthorizedByKey(req)) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const payload = getAuthHealthPayload();
    const status = payload.ok ? 200 : 503;

    return NextResponse.json(payload, { status });
}