import { createOpenAI } from "@ai-sdk/openai";
import type { LanguageModel } from "ai";

type AiProvider = "ollama" | "huggingface";

// Ollama provider (local, OpenAI-compatible API)
const OLLAMA_MODEL = "gpt-oss:20b-cloud";
const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL ?? "http://127.0.0.1:11434/v1";

// HuggingFace — default primary provider (OpenAI-compatible Inference API)
const HF_MODEL = process.env.HF_MODEL ?? "meta-llama/Llama-3.1-70B-Instruct";
const HF_BASE_URL = "https://api-inference.huggingface.co/v1";
const AI_PRIMARY_PROVIDER: AiProvider =
    process.env.AI_PRIMARY_PROVIDER === "ollama" ? "ollama" : "huggingface";

function hasHuggingFace(): boolean {
    return Boolean(process.env.HUGGINGFACE_API_KEY && process.env.HUGGINGFACE_API_KEY.trim());
}

function hasOllama(): boolean {
    // Ollama is considered available when base URL is present or defaultable.
    return Boolean(OLLAMA_BASE_URL && OLLAMA_BASE_URL.trim());
}

function createOllamaProvider(): ReturnType<typeof createOpenAI> {
    return createOpenAI({
        baseURL: OLLAMA_BASE_URL,
        apiKey: "ollama", // Ollama doesn't require a real key
        name: "ollama",
    });
}

function createHuggingFaceProvider(): ReturnType<typeof createOpenAI> {
    return createOpenAI({
        baseURL: HF_BASE_URL,
        apiKey: process.env.HUGGINGFACE_API_KEY ?? "",
        name: "huggingface",
    });
}

export function getAvailableProviders(): AiProvider[] {
    const providers: AiProvider[] = [];
    if (hasOllama()) providers.push("ollama");
    if (hasHuggingFace()) providers.push("huggingface");
    return providers;
}

export function getProviderOrder(): AiProvider[] {
    const available = getAvailableProviders();
    if (available.length === 0) return [];

    if (AI_PRIMARY_PROVIDER === "huggingface") {
        return available.includes("huggingface")
            ? ["huggingface", ...available.filter((p) => p !== "huggingface")]
            : available;
    }

    return available.includes("ollama")
        ? ["ollama", ...available.filter((p) => p !== "ollama")]
        : available;
}

export function getModelForProvider(provider: AiProvider): LanguageModel {
    if (provider === "ollama") {
        const ollama = createOllamaProvider();
        return ollama(OLLAMA_MODEL);
    }
    const hf = createHuggingFaceProvider();
    return hf(HF_MODEL);
}

export function getModel(): LanguageModel {
    const order = getProviderOrder();
    const primary = order[0];
    if (!primary) {
        throw new Error(
            "No AI provider configured. Set OLLAMA_BASE_URL and/or HUGGINGFACE_API_KEY in .env.local",
        );
    }
    return getModelForProvider(primary);
}

export { createOllamaProvider, createHuggingFaceProvider };
