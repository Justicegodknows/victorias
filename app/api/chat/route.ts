import { streamText, stepCountIs, convertToModelMessages, type UIMessage } from "ai";
import { getModel } from "@/app/lib/ai/provider";
import { SYSTEM_PROMPT } from "@/app/lib/ai/system-prompt";
import { agentTools } from "@/app/lib/ai/tools";
import { createSupabaseServer } from "@/app/lib/supabase/server";
import { retrieveContext } from "@/app/lib/ai/rag";

export async function POST(req: Request): Promise<Response> {
    const supabase = await createSupabaseServer();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        return new Response("Please sign in to use the chat.", { status: 401 });
    }

    const { messages } = (await req.json()) as { messages: UIMessage[] };
    const modelMessages = await convertToModelMessages(messages);

    // Extract the latest user message text for RAG retrieval
    const lastUserMessage = [...messages].reverse().find((m) => m.role === "user");
    let ragContext = "";
    if (lastUserMessage?.parts) {
        const userText = lastUserMessage.parts
            .filter((p): p is { type: "text"; text: string } => p.type === "text")
            .map((p) => p.text)
            .join(" ");
        if (userText) {
            try {
                ragContext = await retrieveContext(userText);
            } catch (e) {
                // RAG is best-effort — don't block the chat if it fails
                console.error("[RAG] Context retrieval failed:", e);
            }
        }
    }

    const systemPrompt = ragContext
        ? `${SYSTEM_PROMPT}\n\n---\n\n# Retrieved Context\nThe following information was retrieved from the knowledge base based on the user's latest message. Use it to provide more accurate and relevant responses, but always verify with your tools before presenting listings.\n\n${ragContext}`
        : SYSTEM_PROMPT;

    let model;
    try {
        model = getModel();
    } catch (error) {
        console.error("[Chat] No AI provider configured:", error);
        return new Response(
            "No AI provider is configured. Please set HUGGINGFACE_API_KEY in your environment.",
            { status: 502 },
        );
    }

    try {
        const result = streamText({
            model,
            system: systemPrompt,
            messages: modelMessages,
            tools: agentTools,
            stopWhen: stepCountIs(10),
            onStepFinish({ toolCalls }) {
                // Log tool usage for debugging (server-side only)
                if (toolCalls && toolCalls.length > 0) {
                    console.log(
                        "[AI Agent] Tools called:",
                        toolCalls.map((tc: { toolName: string }) => tc.toolName).join(", "),
                    );
                }
            },
            onError({ error }) {
                console.error("[Chat] Streaming error:", error);
            },
        });

        return result.toUIMessageStreamResponse();
    } catch (error) {
        console.error("[Chat] streamText failed:", error);
        const message = error instanceof Error ? error.message : "AI provider unavailable.";
        return new Response(
            `AI error: ${message}`,
            { status: 502 },
        );
    }
}
