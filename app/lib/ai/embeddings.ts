import { embed, embedMany, type EmbeddingModel } from "ai";
import { createOpenAI } from "@ai-sdk/openai";

type EmbeddingProvider = "ollama" | "huggingface";

// Ollama embedding model (local, OpenAI-compatible)
const OLLAMA_EMBEDDING_MODEL = process.env.OLLAMA_EMBEDDING_MODEL ?? "nomic-embed-text";
const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL ?? "http://127.0.0.1:11434/v1";

// HuggingFace embedding model (fallback)
const HF_EMBEDDING_MODEL =
    process.env.HF_EMBEDDING_MODEL ?? "sentence-transformers/all-MiniLM-L6-v2";
const HF_BASE_URL = "https://api-inference.huggingface.co/v1";

// Ollama is the default primary; set EMBEDDING_PRIMARY_PROVIDER=huggingface to override.
const EMBEDDING_PRIMARY_PROVIDER =
    process.env.EMBEDDING_PRIMARY_PROVIDER === "huggingface" ? "huggingface" : "ollama";

function hasHuggingFaceEmbeddings(): boolean {
    return Boolean(process.env.HUGGINGFACE_API_KEY && process.env.HUGGINGFACE_API_KEY.trim());
}

// Ollama is always considered configured — it runs locally with no key required.
function hasOllamaEmbeddings(): boolean {
    return true;
}

function getEmbeddingProviderOrder(): EmbeddingProvider[] {
    const available: EmbeddingProvider[] = [];
    if (hasOllamaEmbeddings()) available.push("ollama");
    if (hasHuggingFaceEmbeddings()) available.push("huggingface");

    if (available.length === 0) return [];

    if (EMBEDDING_PRIMARY_PROVIDER === "huggingface") {
        return available.includes("huggingface")
            ? ["huggingface", ...available.filter((p) => p !== "huggingface")]
            : available;
    }

    return available.includes("ollama")
        ? ["ollama", ...available.filter((p) => p !== "ollama")]
        : available;
}

function getEmbeddingModel(provider: EmbeddingProvider): EmbeddingModel {
    if (provider === "ollama") {
        const ollama = createOpenAI({
            baseURL: OLLAMA_BASE_URL,
            apiKey: "ollama",
            name: "ollama-embeddings",
        });
        return ollama.embedding(OLLAMA_EMBEDDING_MODEL);
    }

    const hf = createOpenAI({
        baseURL: HF_BASE_URL,
        apiKey: process.env.HUGGINGFACE_API_KEY,
        name: "huggingface-embeddings",
    });
    return hf.embedding(HF_EMBEDDING_MODEL);
}

function getPrimaryEmbeddingModel(): EmbeddingModel {
    const order = getEmbeddingProviderOrder();
    const primary = order[0];
    if (!primary) {
        throw new Error(
            "No embedding provider configured. Set OLLAMA_BASE_URL and/or HUGGINGFACE_API_KEY.",
        );
    }
    return getEmbeddingModel(primary);
}

function buildEmbeddingErrorMessage(errors: string[]): string {
    return [
        "Embedding generation failed across all configured providers.",
        ...errors,
    ].join(" ");
}

async function withEmbeddingFallback<T>(
    run: (model: EmbeddingModel) => Promise<T>,
): Promise<T> {
    const providerOrder = getEmbeddingProviderOrder();
    if (providerOrder.length === 0) {
        throw new Error(
            "No embedding provider configured. Set OLLAMA_BASE_URL and/or HUGGINGFACE_API_KEY.",
        );
    }

    const errors: string[] = [];

    for (const provider of providerOrder) {
        try {
            const model = getEmbeddingModel(provider);
            return await run(model);
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            errors.push(`${provider}: ${message}`);
        }
    }

    throw new Error(buildEmbeddingErrorMessage(errors));
}

export function getEmbeddingModelOrder(): EmbeddingProvider[] {
    return getEmbeddingProviderOrder();
}

export function getEmbeddingModelPrimary(): EmbeddingModel {
    return getPrimaryEmbeddingModel();
}

/**
 * Generate a single embedding vector for a text string.
 */
export async function generateEmbedding(text: string): Promise<number[]> {
    const result = await withEmbeddingFallback((model) => embed({ model, value: text }));
    return result.embedding as unknown as number[];
}

/**
 * Generate embeddings for multiple text strings in batch.
 */
export async function generateEmbeddings(
    texts: string[],
): Promise<number[][]> {
    const result = await withEmbeddingFallback((model) =>
        embedMany({ model, values: texts, maxParallelCalls: 5 }),
    );
    return result.embeddings as unknown as number[][];
}

export { getEmbeddingModel };
