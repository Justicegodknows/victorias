type ProviderName = "ollama" | "huggingface";

type ProviderProbe = {
    provider: ProviderName;
    configured: boolean;
    reachable: boolean;
    latency_ms: number | null;
    status: "healthy" | "unreachable" | "not_configured";
    message: string;
};

type ProbeResult = {
    ok: boolean;
    latency_ms: number | null;
    message: string;
};

import { checkMlHealth } from "@/app/lib/ai/ml-client";

const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL ?? "http://127.0.0.1:11434/v1";
// Ollama is primary by default; set AI_PRIMARY_PROVIDER=huggingface to override.
const AI_PRIMARY_PROVIDER =
    process.env.AI_PRIMARY_PROVIDER === "huggingface" ? "huggingface" : "ollama";
// Ollama is primary by default; set EMBEDDING_PRIMARY_PROVIDER=huggingface to override.
const EMBEDDING_PRIMARY_PROVIDER =
    process.env.EMBEDDING_PRIMARY_PROVIDER === "huggingface" ? "huggingface" : "ollama";

function getProviderOrder(primary: ProviderName, hasOllama: boolean, hasHuggingFace: boolean): ProviderName[] {
    const available: ProviderName[] = [];
    if (hasOllama) available.push("ollama");
    if (hasHuggingFace) available.push("huggingface");

    if (!available.includes(primary)) return available;
    return [primary, ...available.filter((p) => p !== primary)];
}

async function probeWithTimeout(url: string, init: RequestInit, timeoutMs: number): Promise<ProbeResult> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    const startedAt = Date.now();

    try {
        const response = await fetch(url, { ...init, signal: controller.signal, cache: "no-store" });
        const latency = Date.now() - startedAt;
        if (!response.ok) {
            return {
                ok: false,
                latency_ms: latency,
                message: `HTTP ${response.status}`,
            };
        }
        return {
            ok: true,
            latency_ms: latency,
            message: "reachable",
        };
    } catch (error) {
        const latency = Date.now() - startedAt;
        const message = error instanceof Error ? error.message : "unknown error";
        return {
            ok: false,
            latency_ms: latency,
            message,
        };
    } finally {
        clearTimeout(timeout);
    }
}

async function probeOllama(): Promise<ProviderProbe> {
    const base = OLLAMA_BASE_URL.replace(/\/$/, "");
    const probe = await probeWithTimeout(`${base}/models`, { method: "GET" }, 4000);

    return {
        provider: "ollama",
        configured: true,
        reachable: probe.ok,
        latency_ms: probe.latency_ms,
        status: probe.ok ? "healthy" : "unreachable",
        message: probe.ok ? "Ollama API reachable." : `Ollama probe failed: ${probe.message}`,
    };
}

async function probeHuggingFace(): Promise<ProviderProbe> {
    const configured = Boolean(process.env.HUGGINGFACE_API_KEY && process.env.HUGGINGFACE_API_KEY.trim());
    if (!configured) {
        return {
            provider: "huggingface",
            configured: false,
            reachable: false,
            latency_ms: null,
            status: "not_configured",
            message: "HUGGINGFACE_API_KEY is not configured.",
        };
    }

    const probe = await probeWithTimeout(
        "https://huggingface.co/api/whoami-v2",
        {
            method: "GET",
            headers: {
                Authorization: `Bearer ${process.env.HUGGINGFACE_API_KEY}`,
            },
        },
        5000,
    );

    return {
        provider: "huggingface",
        configured: true,
        reachable: probe.ok,
        latency_ms: probe.latency_ms,
        status: probe.ok ? "healthy" : "unreachable",
        message: probe.ok
            ? "HuggingFace API reachable."
            : `HuggingFace probe failed: ${probe.message}`,
    };
}

export async function getAiHealthSnapshot(): Promise<Record<string, unknown>> {
    const [ollama, huggingface, mlModel] = await Promise.all([
        probeOllama(),
        probeHuggingFace(),
        checkMlHealth(),
    ]);

    const chatOrder = getProviderOrder(
        AI_PRIMARY_PROVIDER,
        ollama.configured,
        huggingface.configured,
    );
    const embeddingOrder = getProviderOrder(
        EMBEDDING_PRIMARY_PROVIDER,
        ollama.configured,
        huggingface.configured,
    );

    const chatReady = chatOrder.some((provider) =>
        provider === "ollama" ? ollama.reachable : huggingface.reachable,
    );
    const embeddingsReady = embeddingOrder.some((provider) =>
        provider === "ollama" ? ollama.reachable : huggingface.reachable,
    );

    return {
        timestamp: new Date().toISOString(),
        primary_provider: {
            chat: AI_PRIMARY_PROVIDER,
            embeddings: EMBEDDING_PRIMARY_PROVIDER,
        },
        provider_order: {
            chat: chatOrder,
            embeddings: embeddingOrder,
        },
        providers: {
            ollama,
            huggingface,
        },
        ml_model: {
            url: (process.env.ML_MODEL_BASE_URL ?? "https://property-price-model.onrender.com"),
            reachable: mlModel.reachable,
            latency_ms: mlModel.latency_ms,
            status: mlModel.reachable ? "healthy" : "unreachable",
            message: mlModel.message,
        },
        readiness: {
            chat: chatReady,
            embeddings: embeddingsReady,
            ml_predictions: mlModel.reachable,
            overall: chatReady && embeddingsReady,
        },
    };
}
