import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/app/lib/supabase/server";
import { getAiHealthSnapshot } from "@/app/lib/ai/health";

function isAuthorizedByKey(req: Request): boolean {
    const configured = process.env.AI_HEALTH_KEY;
    if (!configured) return false;
    const provided = req.headers.get("x-ai-health-key");
    return Boolean(provided && provided === configured);
}

export async function GET(req: Request): Promise<Response> {
    // Allow machine checks with AI_HEALTH_KEY, otherwise require authenticated user.
    if (!isAuthorizedByKey(req)) {
        const supabase = await createSupabaseServer();
        const {
            data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
    }

    const health = await getAiHealthSnapshot();
    return NextResponse.json(health, { status: 200 });
}
