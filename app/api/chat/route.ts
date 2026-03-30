import { streamText, stepCountIs } from "ai";
import { getModel } from "@/app/lib/ai/provider";
import { SYSTEM_PROMPT } from "@/app/lib/ai/system-prompt";
import { agentTools } from "@/app/lib/ai/tools";
import { createSupabaseServer } from "@/app/lib/supabase/server";

export async function POST(req: Request): Promise<Response> {
    const supabase = await createSupabaseServer();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        return new Response("Unauthorized", { status: 401 });
    }

    const { messages } = await req.json();

    const result = streamText({
        model: getModel(),
        system: SYSTEM_PROMPT,
        messages,
        tools: agentTools,
        stopWhen: stepCountIs(10),
        onStepFinish({ toolCalls, toolResults }) {
            // Log tool usage for debugging (server-side only)
            if (toolCalls && toolCalls.length > 0) {
                console.log(
                    "[AI Agent] Tools called:",
                    toolCalls.map((tc: { toolName: string }) => tc.toolName).join(", "),
                );
            }
        },
    });

    return result.toTextStreamResponse();
}
