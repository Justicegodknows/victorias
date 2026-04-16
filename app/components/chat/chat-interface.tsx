"use client";

import { useChat } from "@ai-sdk/react";
import { isToolUIPart, getToolName } from "ai";
import { useState, useRef, useEffect } from "react";
import { ApartmentCard, type ApartmentCardData } from "@/app/components/chat/apartment-card";

/** Human-readable labels for tool loading states */
const TOOL_LABELS: Record<string, string> = {
    searchApartments: "Searching listings...",
    semanticSearchApartments: "Searching listings...",
    semanticSearchKnowledge: "Looking up neighborhood info...",
    webSearch: "Searching the web...",
    getApartmentDetails: "Fetching apartment details...",
    checkAffordability: "Running affordability check...",
    getNeighborhoodInfo: "Loading neighborhood data...",
    getRentalPriceIndex: "Fetching rental price index...",
    compareRpiAcrossLgas: "Comparing rental prices...",
    assessRentVsMarket: "Assessing rent vs market...",
    saveApartment: "Saving apartment...",
    createInquiry: "Sending inquiry...",
    generateTenancyAgreementTemplate: "Preparing agreement template...",
};

/** Returns true if a text part is actually a raw function-call JSON emitted by the model */
function isRawToolCallText(text: string): boolean {
    const t = text.trim();
    return (
        t.startsWith("{") &&
        (t.includes('"type":"function"') || t.includes('"type": "function"') ||
            t.includes('"name":"') && t.includes('"arguments":'))
    );
}

const suggestions = [
    "Find me a 2-bedroom in Lekki under ₦2M",
    "Affordable studio in Yaba near Tech Hub",
    "Serviced apartment in Abuja with 24/7 power",
    "What's the best neighborhood for expats in Lagos?",
];

export function ChatInterface(): React.ReactElement {
    const { messages, sendMessage, status, error } = useChat();
    const [input, setInput] = useState("");
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    function handleSubmit(e: React.FormEvent): void {
        e.preventDefault();
        if (!input.trim() || status === "streaming") return;
        sendMessage({ text: input });
        setInput("");
    }

    function handleSuggestion(suggestion: string): void {
        sendMessage({ text: suggestion });
    }

    return (
        <div className="flex h-full flex-col bg-[#f5ebe2] dark:bg-zinc-950">
            {/* Messages area */}
            <div className="flex-1 overflow-y-auto no-scrollbar px-4 py-8">
                <div className="mx-auto max-w-4xl w-full flex flex-col gap-8">
                    {messages.length === 0 && (
                        <div className="flex flex-col items-center justify-center text-center py-12">
                            <div className="w-20 h-20 rounded-full bg-[#7b5d43] flex items-center justify-center text-white shadow-2xl mb-6 relative">
                                <span className="text-4xl">✨</span>
                                <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-amber-400 border-4 border-[#f5ebe2] dark:border-zinc-950 rounded-full" />
                            </div>
                            <h3 className="text-2xl font-(family-name:--font-geist-sans) font-bold text-[#2a221d] dark:text-zinc-50 mb-2">
                                Hi! I&apos;m Victoria
                            </h3>
                            <p className="text-[#6a5e54] dark:text-zinc-400 max-w-md text-sm leading-relaxed mb-10">
                                Your premium AI apartment curator for the Nigerian market. How can I help you find your dream home today?
                            </p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-2xl px-4">
                                {suggestions.map((suggestion) => (
                                    <button
                                        key={suggestion}
                                        type="button"
                                        onClick={() => handleSuggestion(suggestion)}
                                        className="px-5 py-4 bg-[#f8efe7] dark:bg-zinc-900 text-left text-sm font-medium text-amber-800 dark:text-amber-400 rounded-2xl hover:bg-[#efe0d2] dark:hover:bg-zinc-800 transition-colors shadow-sm"
                                    >
                                        {suggestion}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {messages.map((message) => (
                        <div
                            key={message.id}
                            className={`flex w-full ${message.role === "user" ? "justify-end" : "justify-start"}`}
                        >
                            <div
                                className={`max-w-[85%] md:max-w-[80%] text-sm leading-relaxed ${message.role === "user"
                                    ? "bg-[#7b5d43] px-6 py-4 rounded-2xl rounded-tr-none text-white shadow-lg"
                                    : "flex flex-col gap-4"
                                    }`}
                            >
                                {message.parts.map((part, i) => {
                                    // ── Text parts ──────────────────────────────────────────
                                    if (part.type === "text") {
                                        // Some small models emit tool calls as raw JSON text.
                                        // Skip those — the real tool-call part handles display.
                                        if (isRawToolCallText(part.text)) return null;
                                        if (!part.text.trim()) return null;

                                        if (message.role === "user") {
                                            return <p key={i} className="whitespace-pre-wrap">{part.text}</p>;
                                        }
                                        return (
                                            <div key={i} className="bg-zinc-100 dark:bg-zinc-800 px-6 py-4 rounded-2xl rounded-tl-none text-[#2a221d] dark:text-zinc-50 shadow-sm">
                                                <p className="whitespace-pre-wrap">{part.text}</p>
                                            </div>
                                        );
                                    }

                                    // ── Tool parts ──────────────────────────────────────────
                                    if (isToolUIPart(part)) {
                                        const toolName = getToolName(part);

                                        // In-progress: show a loading pill
                                        if (part.state === "input-streaming" || part.state === "input-available") {
                                            const label = TOOL_LABELS[toolName] ?? "Working...";
                                            return (
                                                <div key={i} className="flex items-center gap-2 text-xs text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 px-4 py-2 rounded-full w-fit">
                                                    <svg className="animate-spin w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                                        <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                                                    </svg>
                                                    <span>{label}</span>
                                                </div>
                                            );
                                        }

                                        // Completed: render results
                                        if (part.state === "output-available") {
                                            const output = part.output as Record<string, unknown>;

                                            // searchApartments — full apartment objects
                                            if (toolName === "searchApartments" && output?.results) {
                                                const apartments = output.results as ApartmentCardData[];
                                                if (apartments.length === 0) return null;
                                                return (
                                                    <div key={i} className="flex gap-4 overflow-x-auto no-scrollbar pb-2">
                                                        {apartments.map((apt, j) => (
                                                            <ApartmentCard key={apt.title + j} apartment={apt} />
                                                        ))}
                                                    </div>
                                                );
                                            }

                                            // semanticSearchApartments — results with metadata
                                            if (toolName === "semanticSearchApartments" && output?.results) {
                                                type SemanticResult = { apartment_id: string; summary: string; metadata: Record<string, unknown> };
                                                const results = output.results as SemanticResult[];
                                                if (results.length === 0) return null;
                                                const apartments: ApartmentCardData[] = results.map((r) => ({
                                                    ppid: r.metadata.ppid as string | undefined,
                                                    title: (r.metadata.title as string) ?? `Apartment ${r.apartment_id}`,
                                                    apartment_type: (r.metadata.apartment_type as string) ?? "",
                                                    annual_rent: (r.metadata.annual_rent as number) ?? 0,
                                                    total_upfront_cost: (r.metadata.total_upfront_cost as number) ?? 0,
                                                    city: (r.metadata.city as string) ?? "",
                                                    neighborhood: (r.metadata.neighborhood as string) ?? "",
                                                    description: r.summary,
                                                    primary_image: (r.metadata.primary_image as string | null) ?? null,
                                                    amenities: (r.metadata.amenities as string[]) ?? [],
                                                }));
                                                return (
                                                    <div key={i} className="flex gap-4 overflow-x-auto no-scrollbar pb-2">
                                                        {apartments.map((apt, j) => (
                                                            <ApartmentCard key={apt.title + j} apartment={apt} />
                                                        ))}
                                                    </div>
                                                );
                                            }

                                            // semanticSearchKnowledge — text results
                                            if (toolName === "semanticSearchKnowledge" && output?.results) {
                                                type KnowledgeResult = { summary: string; source_type?: string };
                                                const results = output.results as KnowledgeResult[];
                                                if (results.length === 0) return null;
                                                return (
                                                    <div key={i} className="flex flex-col gap-2">
                                                        {results.map((r, j) => (
                                                            <div key={j} className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 px-4 py-3 rounded-xl text-xs text-amber-900 dark:text-amber-300">
                                                                {r.source_type && <span className="uppercase tracking-widest text-[10px] opacity-60 block mb-1">{r.source_type.replace("_", " ")}</span>}
                                                                <p>{r.summary}</p>
                                                            </div>
                                                        ))}
                                                    </div>
                                                );
                                            }

                                            // checkAffordability
                                            if (toolName === "checkAffordability" && output) {
                                                const affordable = output.is_affordable as boolean;
                                                return (
                                                    <div
                                                        key={i}
                                                        className={`rounded-2xl p-4 ${affordable
                                                            ? "bg-[#f3ddc8] dark:bg-amber-950 text-amber-900 dark:text-amber-300"
                                                            : "bg-[#ffdad6] dark:bg-red-950 text-[#93000a] dark:text-red-300"
                                                            }`}
                                                    >
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <span className="text-lg">{affordable ? "✓" : "⚠"}</span>
                                                            <span className="text-sm font-bold">
                                                                {output.recommendation as string}
                                                            </span>
                                                        </div>
                                                        <p className="text-xs opacity-80">
                                                            Rent-to-income: {output.rent_to_income_percentage as string} | Total upfront: {output.total_upfront_cost_formatted as string}
                                                        </p>
                                                    </div>
                                                );
                                            }

                                            // Fallback: show a completion pill for tools without custom renderers
                                            const doneLabel = TOOL_LABELS[toolName]?.replace(/\.\.\.$/, "") ?? toolName;
                                            return (
                                                <div key={i} className="flex items-center gap-2 text-xs text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 px-4 py-2 rounded-full w-fit">
                                                    <span>✓</span>
                                                    <span>{doneLabel} done</span>
                                                </div>
                                            );
                                        }
                                    }

                                    return null;
                                })}
                            </div>
                        </div>
                    ))}

                    {status === "streaming" && (
                        <div className="flex justify-start w-full">
                            <div className="bg-zinc-100 dark:bg-zinc-800 px-4 py-3 rounded-2xl rounded-tl-none flex items-center gap-1">
                                <div className="w-1.5 h-1.5 rounded-full bg-[#7b5d43] dot-1" />
                                <div className="w-1.5 h-1.5 rounded-full bg-[#7b5d43] dot-2" />
                                <div className="w-1.5 h-1.5 rounded-full bg-[#7b5d43] dot-3" />
                            </div>
                        </div>
                    )}

                    {error && (
                        <div className="rounded-2xl bg-[#ffdad6] dark:bg-red-950 p-4 text-sm text-[#93000a] dark:text-red-300">
                            <p>{error.message || "Something went wrong. Please try again."}</p>
                        </div>
                    )}

                    <div ref={messagesEndRef} />
                </div>
            </div>

            {/* Input area */}
            <div className="p-6 bg-[#f8efe7]/50 dark:bg-zinc-900/50 backdrop-blur-md">
                <form onSubmit={handleSubmit} className="mx-auto flex max-w-4xl gap-3 items-end">
                    <div className="flex-1 bg-white dark:bg-zinc-900 rounded-2xl shadow-sm px-4 py-3 flex items-center gap-3">
                        <textarea
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === "Enter" && !e.shiftKey) {
                                    e.preventDefault();
                                    handleSubmit(e);
                                }
                            }}
                            placeholder="Message Victoria..."
                            className="flex-1 bg-transparent border-none focus:ring-0 text-sm py-1 resize-none h-6 no-scrollbar leading-tight placeholder:text-zinc-400 dark:placeholder:text-zinc-500 text-[#2a221d] dark:text-zinc-50"
                            rows={1}
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={!input.trim() || status === "streaming"}
                        aria-label="Send message"
                        className="w-12 h-12 bg-[#7b5d43] hover:bg-[#d78f45] text-white rounded-2xl flex items-center justify-center shadow-lg transition-transform active:scale-95 disabled:opacity-50"
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="22" y1="2" x2="11" y2="13" />
                            <polygon points="22 2 15 22 11 13 2 9 22 2" />
                        </svg>
                    </button>
                </form>
                <p className="text-[10px] text-zinc-400 text-center mt-3 uppercase tracking-[0.2em] font-mono">
                    Victoria can occasionally provide estimates; verify critical info with landlords.
                </p>
            </div>
        </div>
    );
}
