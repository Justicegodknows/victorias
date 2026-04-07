import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/app/lib/supabase/server";
import {
    syncApartmentEmbeddings,
    syncKnowledgeEmbeddings,
    syncSingleApartmentEmbedding,
} from "@/app/lib/ai/rag";

/**
 * POST /api/embeddings — Sync embeddings for apartments and/or knowledge.
 *
 * Body:
 *   { "target": "all" | "apartments" | "knowledge" | "apartment", "apartment_id"?: string }
 *
 * Requires authenticated landlord or service-role access.
 */
export async function POST(req: Request): Promise<Response> {
    const supabase = await createSupabaseServer();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await req.json()) as {
        target: "all" | "apartments" | "knowledge" | "apartment";
        apartment_id?: string;
    };

    try {
        const results: Record<string, unknown> = {};

        if (body.target === "apartment" && body.apartment_id) {
            // Sync a single apartment
            const success = await syncSingleApartmentEmbedding(body.apartment_id);
            results.apartment = { apartment_id: body.apartment_id, success };
        }

        if (body.target === "all" || body.target === "apartments") {
            results.apartments = await syncApartmentEmbeddings();
        }

        if (body.target === "all" || body.target === "knowledge") {
            results.knowledge = await syncKnowledgeEmbeddings();
        }

        return NextResponse.json({ ok: true, results });
    } catch (error) {
        console.error("[Embeddings] Sync failed:", error);
        return NextResponse.json(
            { error: "Embedding sync failed. Check provider configuration." },
            { status: 502 },
        );
    }
}
