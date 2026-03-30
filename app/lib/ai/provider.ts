import { createOpenAI } from "@ai-sdk/openai";
import type { LanguageModel } from "ai";

// Ollama — primary provider (local, OpenAI-compatible API)
const OLLAMA_MODEL = "gpt-oss:20b-cloud";
const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL ?? "http://127.0.0.1:11434/v1";

// HuggingFace — fallback provider (OpenAI-compatible Inference API)
const HF_MODEL = process.env.HF_MODEL ?? "meta-llama/Llama-3.1-70B-Instruct";
const HF_BASE_URL = "https://api-inference.huggingface.co/v1";

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

export function getModel(): LanguageModel {
    // Primary: Ollama (local)
    if (process.env.OLLAMA_BASE_URL || !process.env.HUGGINGFACE_API_KEY) {
        const ollama = createOllamaProvider();
        return ollama(OLLAMA_MODEL);
    }
    // Fallback: HuggingFace
    if (process.env.HUGGINGFACE_API_KEY) {
        const hf = createHuggingFaceProvider();
        return hf(HF_MODEL);
    }
    throw new Error(
        "No AI provider configured. Ensure Ollama is running or set HUGGINGFACE_API_KEY in .env.local",
    );
}

export { createOllamaProvider, createHuggingFaceProvider };
