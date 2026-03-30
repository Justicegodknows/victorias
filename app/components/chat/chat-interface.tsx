"use client";

import { useChat } from "@ai-sdk/react";
import { useState, useRef, useEffect } from "react";
import { ApartmentCard } from "@/app/components/chat/apartment-card";

export function ChatInterface(): React.ReactElement {
    const { messages, sendMessage, status, error } = useChat({
        api: "/api/chat",
    });
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
        <div className="flex h-full flex-col">
            {/* Messages area */}
            <div className="flex-1 overflow-y-auto px-4 py-6">
                <div className="mx-auto max-w-3xl space-y-6">
                    {messages.length === 0 && (
                        <div className="flex flex-col items-center justify-center py-20 text-center">
                            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900">
                                <svg className="h-8 w-8 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
                                </svg>
                            </div>
                            <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
                                Hi! I&apos;m Victoria
                            </h2>
                            <p className="mt-2 max-w-md text-sm text-zinc-600 dark:text-zinc-400">
                                Your AI apartment finder for Nigeria. Tell me what you&apos;re looking for — your budget, preferred city, apartment type, and any must-have features.
                            </p>
                            <div className="mt-6 flex flex-wrap justify-center gap-2">
                                {[
                                    "Find me a 2-bedroom in Lekki under ₦2M",
                                    "What's available in Wuse 2, Abuja?",
                                    "I earn ₦4M/year, what can I afford?",
                                    "Is Ajah prone to flooding?",
                                ].map((suggestion) => (
                                    <button
                                        key={suggestion}
                                        type="button"
                                        onClick={() => handleSuggestion(suggestion)}
                                        className="rounded-full border border-zinc-200 px-3 py-1.5 text-xs text-zinc-600 transition-colors hover:border-green-300 hover:bg-green-50 hover:text-green-700 dark:border-zinc-700 dark:text-zinc-400 dark:hover:border-green-800 dark:hover:bg-green-950 dark:hover:text-green-400"
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
                            className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                        >
                            <div
                                className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${message.role === "user"
                                    ? "bg-green-600 text-white"
                                    : "bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-50"
                                    }`}
                            >
                                {message.parts.map((part, i) => {
                                    if (part.type === "text") {
                                        return <p key={i} className="whitespace-pre-wrap">{part.text}</p>;
                                    }
                                    if (part.type.startsWith("tool-") && part.state === "output-available") {
                                        const output = (part as unknown as { output: Record<string, unknown> }).output;
                                        const toolName = part.type.replace("tool-", "");

                                        if (toolName === "searchApartments" && output?.results) {
                                            const apartments = output.results as Array<Record<string, unknown>>;
                                            return (
                                                <div key={i} className="mt-2 space-y-3">
                                                    {apartments.map((apt) => (
                                                        <ApartmentCard key={apt.id as string} apartment={apt} />
                                                    ))}
                                                </div>
                                            );
                                        }

                                        if (toolName === "checkAffordability" && output) {
                                            const affordable = output.is_affordable as boolean;
                                            return (
                                                <div
                                                    key={i}
                                                    className={`mt-2 rounded-lg border p-3 ${affordable
                                                        ? "border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950"
                                                        : "border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950"
                                                        }`}
                                                >
                                                    <div className="flex items-center gap-2">
                                                        <span className={`text-lg ${affordable ? "text-green-600" : "text-amber-600"}`}>
                                                            {affordable ? "✓" : "⚠"}
                                                        </span>
                                                        <span className="text-sm font-medium">
                                                            {output.recommendation as string}
                                                        </span>
                                                    </div>
                                                    <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
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
                        <div className="flex justify-start">
                            <div className="rounded-2xl bg-zinc-100 px-4 py-3 dark:bg-zinc-800">
                                <div className="flex gap-1">
                                    <span className="h-2 w-2 animate-bounce rounded-full bg-zinc-400 [animation-delay:-0.3s]" />
                                    <span className="h-2 w-2 animate-bounce rounded-full bg-zinc-400 [animation-delay:-0.15s]" />
                                    <span className="h-2 w-2 animate-bounce rounded-full bg-zinc-400" />
                                </div>
                            </div>
                        </div>
                    )}

                    {error && (
                        <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
                            Something went wrong. Please try again.
                        </div>
                    )}

                    <div ref={messagesEndRef} />
                </div>
            </div>

            {/* Input area */}
            <div className="border-t border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
                <form onSubmit={handleSubmit} className="mx-auto flex max-w-3xl gap-3">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Ask Victoria about apartments..."
                        className="flex-1 rounded-xl border border-zinc-300 px-4 py-2.5 text-sm shadow-sm focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-50"
                    />
                    <button
                        type="submit"
                        disabled={!input.trim() || status === "streaming"}
                        className="rounded-xl bg-green-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50"
                    >
                        Send
                    </button>
                </form>
            </div>
        </div>
    );
}
