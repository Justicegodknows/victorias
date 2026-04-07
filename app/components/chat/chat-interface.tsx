"use client";

import { useChat } from "@ai-sdk/react";
import { isToolUIPart, getToolName } from "ai";
import { useState, useRef, useEffect } from "react";
import { ApartmentCard, type ApartmentCardData } from "@/app/components/chat/apartment-card";

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
        <div className="flex h-full flex-col bg-[#fbf8ff] dark:bg-zinc-950">
            {/* Messages area */}
            <div className="flex-1 overflow-y-auto no-scrollbar px-4 py-8">
                <div className="mx-auto max-w-4xl w-full flex flex-col gap-8">
                    {messages.length === 0 && (
                        <div className="flex flex-col items-center justify-center text-center py-12">
                            <div className="w-20 h-20 rounded-full bg-[#006b2c] flex items-center justify-center text-white shadow-2xl mb-6 relative">
                                <span className="text-4xl">✨</span>
                                <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-emerald-400 border-4 border-[#fbf8ff] dark:border-zinc-950 rounded-full" />
                            </div>
                            <h3 className="text-2xl font-(family-name:--font-geist-sans) font-bold text-[#1a1b22] dark:text-zinc-50 mb-2">
                                Hi! I&apos;m Victoria
                            </h3>
                            <p className="text-[#3e4a3d] dark:text-zinc-400 max-w-md text-sm leading-relaxed mb-10">
                                Your premium AI apartment curator for the Nigerian market. How can I help you find your dream home today?
                            </p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-2xl px-4">
                                {suggestions.map((suggestion) => (
                                    <button
                                        key={suggestion}
                                        type="button"
                                        onClick={() => handleSuggestion(suggestion)}
                                        className="px-5 py-4 bg-[#f4f2fd] dark:bg-zinc-900 text-left text-sm font-medium text-emerald-800 dark:text-emerald-400 rounded-2xl hover:bg-[#e3e1ec] dark:hover:bg-zinc-800 transition-colors shadow-sm"
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
                                    ? "bg-[#006b2c] px-6 py-4 rounded-2xl rounded-tr-none text-white shadow-lg"
                                    : "flex flex-col gap-4"
                                    }`}
                            >
                                {message.parts.map((part, i) => {
                                    if (part.type === "text") {
                                        if (message.role === "user") {
                                            return <p key={i} className="whitespace-pre-wrap">{part.text}</p>;
                                        }
                                        return (
                                            <div key={i} className="bg-zinc-100 dark:bg-zinc-800 px-6 py-4 rounded-2xl rounded-tl-none text-[#1a1b22] dark:text-zinc-50 shadow-sm">
                                                <p className="whitespace-pre-wrap">{part.text}</p>
                                            </div>
                                        );
                                    }
                                    if (isToolUIPart(part) && part.state === "output-available") {
                                        const output = part.output as Record<string, unknown>;
                                        const toolName = getToolName(part);

                                        if (toolName === "searchApartments" && output?.results) {
                                            const apartments = output.results as ApartmentCardData[];
                                            return (
                                                <div key={i} className="flex gap-4 overflow-x-auto no-scrollbar pb-2">
                                                    {apartments.map((apt, j) => (
                                                        <ApartmentCard key={apt.title + j} apartment={apt} />
                                                    ))}
                                                </div>
                                            );
                                        }

                                        if (toolName === "checkAffordability" && output) {
                                            const affordable = output.is_affordable as boolean;
                                            return (
                                                <div
                                                    key={i}
                                                    className={`rounded-2xl p-4 ${affordable
                                                        ? "bg-[#baecbc] dark:bg-emerald-950 text-emerald-900 dark:text-emerald-300"
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
                                    }
                                    return null;
                                })}
                            </div>
                        </div>
                    ))}

                    {status === "streaming" && (
                        <div className="flex justify-start w-full">
                            <div className="bg-zinc-100 dark:bg-zinc-800 px-4 py-3 rounded-2xl rounded-tl-none flex items-center gap-1">
                                <div className="w-1.5 h-1.5 rounded-full bg-[#006b2c] dot-1" />
                                <div className="w-1.5 h-1.5 rounded-full bg-[#006b2c] dot-2" />
                                <div className="w-1.5 h-1.5 rounded-full bg-[#006b2c] dot-3" />
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
            <div className="p-6 bg-[#f4f2fd]/50 dark:bg-zinc-900/50 backdrop-blur-md">
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
                            className="flex-1 bg-transparent border-none focus:ring-0 text-sm py-1 resize-none h-6 no-scrollbar leading-tight placeholder:text-zinc-400 dark:placeholder:text-zinc-500 text-[#1a1b22] dark:text-zinc-50"
                            rows={1}
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={!input.trim() || status === "streaming"}
                        aria-label="Send message"
                        className="w-12 h-12 bg-[#006b2c] hover:bg-[#00873a] text-white rounded-2xl flex items-center justify-center shadow-lg transition-transform active:scale-95 disabled:opacity-50"
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
