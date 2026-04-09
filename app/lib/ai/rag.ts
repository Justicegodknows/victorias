import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/app/lib/types";
import { generateEmbedding, generateEmbeddings } from "@/app/lib/ai/embeddings";
import {
    fetchApartmentDocuments,
    fetchApartmentDocument,
    buildNeighborhoodDocuments,
} from "@/app/lib/ai/documents";
import {
    getSupabaseServiceRoleKey,
    getSupabaseUrl,
} from "@/app/lib/supabase/server-env";

// Typed client for known tables
function getServiceClient(): ReturnType<typeof createClient<Database>> {
    return createClient<Database>(
        getSupabaseUrl(),
        getSupabaseServiceRoleKey(),
    );
}

// Untyped client for RPC calls and tables not yet in generated Database types
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- RPC functions added via migration, not in codegen types
function getUntypedServiceClient(): any {
    return createClient(
        getSupabaseUrl(),
        getSupabaseServiceRoleKey(),
    );
}

// ============================================================
// Semantic search: query embeddings
// ============================================================

export type SemanticMatch = {
    apartment_id: string;
    chunk_index: number;
    content: string;
    similarity: number;
    metadata: Record<string, unknown>;
};

export type KnowledgeMatch = {
    source_type: string;
    source_id: string;
    chunk_index: number;
    content: string;
    similarity: number;
    metadata: Record<string, unknown>;
};

/**
 * Semantic search over apartment embeddings.
 */
export async function searchApartmentsBySemantic(
    query: string,
    options?: {
        city?: string;
        apartmentType?: string;
        maxRent?: number;
        matchThreshold?: number;
        matchCount?: number;
    },
): Promise<SemanticMatch[]> {
    const supabase = getUntypedServiceClient();
    const queryEmbedding = await generateEmbedding(query);

    const { data, error } = await supabase.rpc("match_apartments", {
        query_embedding: JSON.stringify(queryEmbedding),
        match_threshold: options?.matchThreshold ?? 0.4,
        match_count: options?.matchCount ?? 10,
        filter_city: options?.city ?? null,
        filter_type: options?.apartmentType ?? null,
        filter_max_rent: options?.maxRent ?? null,
    });

    if (error) {
        console.error("[RAG] match_apartments error:", error.message);
        return [];
    }

    return (data ?? []) as SemanticMatch[];
}

/**
 * Semantic search over knowledge base (neighborhoods, market insights, FAQs).
 */
export async function searchKnowledge(
    query: string,
    options?: {
        sourceType?: string;
        matchThreshold?: number;
        matchCount?: number;
    },
): Promise<KnowledgeMatch[]> {
    const supabase = getUntypedServiceClient();
    const queryEmbedding = await generateEmbedding(query);

    const { data, error } = await supabase.rpc("match_knowledge", {
        query_embedding: JSON.stringify(queryEmbedding),
        match_threshold: options?.matchThreshold ?? 0.4,
        match_count: options?.matchCount ?? 5,
        filter_source_type: options?.sourceType ?? null,
    });

    if (error) {
        console.error("[RAG] match_knowledge error:", error.message);
        return [];
    }

    return (data ?? []) as KnowledgeMatch[];
}

/**
 * Combined RAG retrieval: searches both apartments and knowledge base.
 * Returns formatted context string for injecting into the system prompt.
 */
export async function retrieveContext(
    query: string,
    options?: {
        city?: string;
        maxRent?: number;
    },
): Promise<string> {
    const [apartments, knowledge] = await Promise.all([
        searchApartmentsBySemantic(query, {
            city: options?.city,
            maxRent: options?.maxRent,
            matchCount: 5,
        }),
        searchKnowledge(query, { matchCount: 3 }),
    ]);

    const sections: string[] = [];

    if (apartments.length > 0) {
        sections.push(
            "## Relevant Apartments (from vector search)\n" +
            apartments
                .map(
                    (a, i) =>
                        `[${i + 1}] (similarity: ${a.similarity.toFixed(2)})\n${a.content}`,
                )
                .join("\n\n"),
        );
    }

    if (knowledge.length > 0) {
        sections.push(
            "## Relevant Knowledge\n" +
            knowledge.map((k) => k.content).join("\n\n"),
        );
    }

    return sections.join("\n\n---\n\n");
}

// ============================================================
// Embedding sync: upsert embeddings for apartments & knowledge
// ============================================================

/**
 * Sync embeddings for all available apartments. Upserts into apartment_embeddings.
 */
export async function syncApartmentEmbeddings(): Promise<{
    synced: number;
    errors: string[];
}> {
    const supabase = getUntypedServiceClient();
    const docs = await fetchApartmentDocuments();
    const errors: string[] = [];

    if (docs.length === 0) {
        return { synced: 0, errors: [] };
    }

    // Batch embed all documents
    const texts = docs.map((d) => d.content);
    const embeddings = await generateEmbeddings(texts);

    // Upsert each embedding
    for (let i = 0; i < docs.length; i++) {
        const doc = docs[i];
        const embedding = embeddings[i];

        const { error } = await supabase.from("apartment_embeddings").upsert(
            {
                apartment_id: doc.apartment_id,
                chunk_index: 0,
                content: doc.content,
                embedding: JSON.stringify(embedding),
                metadata: doc.metadata,
            },
            { onConflict: "apartment_id,chunk_index" },
        );

        if (error) {
            errors.push(`Apartment ${doc.apartment_id}: ${error.message}`);
        }
    }

    return { synced: docs.length - errors.length, errors };
}

/**
 * Sync embedding for a single apartment.
 */
export async function syncSingleApartmentEmbedding(apartmentId: string): Promise<boolean> {
    const supabase = getUntypedServiceClient();
    const doc = await fetchApartmentDocument(apartmentId);

    if (!doc) return false;

    const embedding = await generateEmbedding(doc.content);

    const { error } = await supabase.from("apartment_embeddings").upsert(
        {
            apartment_id: doc.apartment_id,
            chunk_index: 0,
            content: doc.content,
            embedding: JSON.stringify(embedding),
            metadata: doc.metadata,
        },
        { onConflict: "apartment_id,chunk_index" },
    );

    if (error) {
        console.error(`[RAG] Failed to sync apartment ${apartmentId}:`, error.message);
        return false;
    }

    return true;
}

/**
 * Sync embeddings for all static neighborhood knowledge.
 */
export async function syncKnowledgeEmbeddings(): Promise<{
    synced: number;
    errors: string[];
}> {
    const supabase = getUntypedServiceClient();
    const docs = buildNeighborhoodDocuments();
    const errors: string[] = [];

    if (docs.length === 0) {
        return { synced: 0, errors: [] };
    }

    const texts = docs.map((d) => d.content);
    const embeddings = await generateEmbeddings(texts);

    for (let i = 0; i < docs.length; i++) {
        const doc = docs[i];
        const embedding = embeddings[i];

        const { error } = await supabase.from("knowledge_embeddings").upsert(
            {
                source_type: doc.source_type,
                source_id: doc.source_id,
                chunk_index: 0,
                content: doc.content,
                embedding: JSON.stringify(embedding),
                metadata: doc.metadata,
            },
            { onConflict: "source_type,source_id,chunk_index" },
        );

        if (error) {
            errors.push(`Knowledge ${doc.source_id}: ${error.message}`);
        }
    }

    return { synced: docs.length - errors.length, errors };
}
