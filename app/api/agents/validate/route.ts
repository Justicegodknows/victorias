import { createSupabaseServer } from "@/app/lib/supabase/server";
import { NextRequest } from "next/server";

export async function GET(req: NextRequest): Promise<Response> {
    const code = req.nextUrl.searchParams.get("code")?.trim().toUpperCase();

    if (!code) {
        return Response.json({ error: "code is required" }, { status: 400 });
    }

    const supabase = await createSupabaseServer();

    const { data, error } = await supabase
        .from("agents")
        .select("id, name")
        .eq("agent_code", code)
        .maybeSingle();

    if (error) {
        return Response.json({ error: "Database error" }, { status: 500 });
    }

    if (!data) {
        return Response.json({ valid: false }, { status: 200 });
    }

    return Response.json({ valid: true, agent_name: data.name }, { status: 200 });
}
