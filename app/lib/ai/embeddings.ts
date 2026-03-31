import { embed, embedMany, type EmbeddingModel } from "ai";
import { createOpenAI } from "@ai-sdk/openai";

// Ollama embedding model (local, OpenAI-compatible)
const OLLAMA_EMBEDDING_MODEL = process.env.OLLAMA_EMBEDDING_MODEL ?? "nomic-embed-text";
const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL ?? "http://127.0.0.1:11434/v1";

// HuggingFace embedding model (fallback)
const HF_EMBEDDING_MODEL =
    process.env.HF_EMBEDDING_MODEL ?? "sentence-transformers/all-MiniLM-L6-v2";
const HF_BASE_URL = "https://api-inference.huggingface.co/v1";

function getEmbeddingModel(): EmbeddingModel {
    // Primary: Ollama
    if (process.env.OLLAMA_BASE_URL || !process.env.HUGGINGFACE_API_KEY) {
        const ollama = createOpenAI({
            baseURL: OLLAMA_BASE_URL,
            apiKey: "ollama",
            name: "ollama-embeddings",
        });
        return ollama.embedding(OLLAMA_EMBEDDING_MODEL);
    }

    // Fallback: HuggingFace
    if (process.env.HUGGINGFACE_API_KEY) {
        const hf = createOpenAI({
            baseURL: HF_BASE_URL,
            apiKey: process.env.HUGGINGFACE_API_KEY,
            name: "huggingface-embeddings",
        });
        return hf.embedding(HF_EMBEDDING_MODEL);
    }

    throw new Error(
        "No embedding provider configured. Ensure Ollama is running or set HUGGINGFACE_API_KEY.",
    );
}

/**
 * Generate a single embedding vector for a text string.
 */
export async function generateEmbedding(text: string): Promise<number[]> {
    const model = getEmbeddingModel();
    const result = await embed({ model, value: text });
    return result.embedding as unknown as number[];
}

/**
 * Generate embeddings for multiple text strings in batch.
 */
export async function generateEmbeddings(
    texts: string[],
): Promise<number[][]> {
    const model = getEmbeddingModel();
    const result = await embedMany({ model, values: texts, maxParallelCalls: 5 });
    return result.embeddings as unknown as number[][];
}

export { getEmbeddingModel };
