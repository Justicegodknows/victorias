import { createOpenAI } from "@ai-sdk/openai";
import type { LanguageModel } from "ai";

type AiProvider = "ollama" | "huggingface";

// Ollama — primary provider. Uses OLLAMA_BASE_URL if set, otherwise the local default.
const OLLAMA_MODEL = process.env.OLLAMA_MODEL ?? "llama3.2";
const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL ?? "http://127.0.0.1:11434/v1";
const OLLAMA_PROBE_TIMEOUT_MS = 2500;

// HuggingFace — fallback provider when Ollama is unreachable.
const HF_MODEL = process.env.HF_MODEL ?? "meta-llama/Llama-3.1-70B-Instruct";
const HF_BASE_URL = "https://api-inference.huggingface.co/v1";

// Ollama is the default primary; set AI_PRIMARY_PROVIDER=huggingface to override.
const AI_PRIMARY_PROVIDER: AiProvider =
    process.env.AI_PRIMARY_PROVIDER === "huggingface" ? "huggingface" : "ollama";

function hasHuggingFace(): boolean {
    return Boolean(process.env.HUGGINGFACE_API_KEY && process.env.HUGGINGFACE_API_KEY.trim());
}

// Ollama is always considered configured — it runs locally with no key required.
// The OLLAMA_BASE_URL env var can override the default endpoint.
function hasOllama(): boolean {
    return true;
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

/**
 * Probe whether the Ollama API is reachable within the given timeout.
 * Returns false if the endpoint is down or the request times out.
 */
async function probeOllamaReachable(timeoutMs = OLLAMA_PROBE_TIMEOUT_MS): Promise<boolean> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
        const base = OLLAMA_BASE_URL.replace(/\/$/, "");
        const res = await fetch(`${base}/models`, {
            method: "GET",
            signal: controller.signal,
            cache: "no-store",
        });
        return res.ok;
    } catch {
        return false;
    } finally {
        clearTimeout(timer);
    }
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

/** Synchronous — returns the statically configured primary model without probing. */
export function getModel(): LanguageModel {
    const order = getProviderOrder();
    const primary = order[0];
    if (!primary) {
        throw new Error(
            "No AI provider configured. Set HUGGINGFACE_API_KEY in .env.local for the HuggingFace fallback.",
        );
    }
    return getModelForProvider(primary);
}

/**
 * Asynchronous — probes Ollama before use and falls back to HuggingFace if
 * Ollama is unreachable. Use this in streaming routes where a mid-flight
 * provider failure cannot be recovered from.
 */
export async function getModelWithFallback(): Promise<LanguageModel> {
    const order = getProviderOrder();
    if (order.length === 0) {
        throw new Error(
            "No AI provider configured. Ensure Ollama is running or set HUGGINGFACE_API_KEY.",
        );
    }

    if (order[0] === "ollama") {
        const reachable = await probeOllamaReachable();
        if (reachable) {
            console.log("[AI Provider] Using Ollama:", OLLAMA_MODEL);
            return getModelForProvider("ollama");
        }
        const fallback = order.find((p) => p !== "ollama");
        if (fallback) {
            console.warn(
                "[AI Provider] Ollama unreachable — falling back to",
                fallback,
            );
            return getModelForProvider(fallback);
        }
        throw new Error(
            "Ollama is unreachable and no fallback provider is configured. Set HUGGINGFACE_API_KEY to enable the HuggingFace fallback.",
        );
    }

    return getModelForProvider(order[0]);
}

export { createOllamaProvider, createHuggingFaceProvider };
