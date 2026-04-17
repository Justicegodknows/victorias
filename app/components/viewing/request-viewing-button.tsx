'use client';

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type Props = {
    apartmentId: string;
    apartmentTitle: string;
};

type Status = "idle" | "loading" | "success" | "error";

export function RequestViewingButton({ apartmentId, apartmentTitle }: Props): React.ReactElement {
    const [open, setOpen] = useState(false);
    const [status, setStatus] = useState<Status>("idle");
    const [errorMsg, setErrorMsg] = useState("");

    const [preferredDate, setPreferredDate] = useState("");
    const [preferredTime, setPreferredTime] = useState<"morning" | "afternoon" | "evening" | "">("");
    const [message, setMessage] = useState("");

    const today = new Date().toISOString().split("T")[0];

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>): Promise<void> {
        e.preventDefault();
        if (!preferredTime) return;

        setStatus("loading");
        setErrorMsg("");

        try {
            const res = await fetch("/api/viewing-requests", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    apartment_id: apartmentId,
                    preferred_date: preferredDate,
                    preferred_time: preferredTime,
                    message: message || undefined,
                }),
            });

            if (!res.ok) {
                const body = (await res.json()) as { error?: string };
                throw new Error(body.error ?? "Request failed");
            }

            setStatus("success");
        } catch (err) {
            setStatus("error");
            setErrorMsg(err instanceof Error ? err.message : "Something went wrong");
        }
    }

    function handleOpenChange(next: boolean): void {
        if (!next) {
            setStatus("idle");
            setErrorMsg("");
            setPreferredDate("");
            setPreferredTime("");
            setMessage("");
        }
        setOpen(next);
    }

    return (
        <>
            <Button
                onClick={() => setOpen(true)}
                className="bg-amber-700 text-white hover:bg-amber-800 active:scale-95 transition-transform"
            >
                Request Viewing
            </Button>

            <Dialog open={open} onOpenChange={handleOpenChange}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle className="font-(family-name:--font-geist-sans) text-base font-bold text-zinc-900 dark:text-zinc-50">
                            Request a Viewing
                        </DialogTitle>
                        <p className="text-sm text-zinc-500 dark:text-zinc-400 pt-1 truncate">{apartmentTitle}</p>
                    </DialogHeader>

                    {status === "success" ? (
                        <div className="py-6 text-center">
                            <p className="text-3xl mb-3">✅</p>
                            <p className="font-semibold text-zinc-900 dark:text-zinc-50">Request sent!</p>
                            <p className="text-sm text-zinc-500 mt-1">
                                The landlord will confirm a time with you shortly.
                            </p>
                            <Button
                                className="mt-6 w-full bg-amber-700 text-white hover:bg-amber-800"
                                onClick={() => handleOpenChange(false)}
                            >
                                Done
                            </Button>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="flex flex-col gap-4 pt-2">
                            <div className="flex flex-col gap-1.5">
                                <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                                    Preferred date
                                </label>
                                <Input
                                    type="date"
                                    min={today}
                                    required
                                    value={preferredDate}
                                    onChange={(e) => setPreferredDate(e.target.value)}
                                />
                            </div>

                            <div className="flex flex-col gap-1.5">
                                <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                                    Preferred time of day
                                </label>
                                <Select
                                    required
                                    value={preferredTime}
                                    onValueChange={(v) => setPreferredTime(v as "morning" | "afternoon" | "evening")}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select time…" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="morning">Morning (8am – 12pm)</SelectItem>
                                        <SelectItem value="afternoon">Afternoon (12pm – 4pm)</SelectItem>
                                        <SelectItem value="evening">Evening (4pm – 7pm)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="flex flex-col gap-1.5">
                                <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                                    Message <span className="text-zinc-400 font-normal">(optional)</span>
                                </label>
                                <Textarea
                                    placeholder="Any questions or things to note for the landlord…"
                                    rows={3}
                                    value={message}
                                    onChange={(e) => setMessage(e.target.value)}
                                />
                            </div>

                            {status === "error" && (
                                <p className="text-sm text-red-600 dark:text-red-400">{errorMsg}</p>
                            )}

                            <div className="flex gap-3 pt-1">
                                <Button
                                    type="button"
                                    variant="outline"
                                    className="flex-1"
                                    onClick={() => handleOpenChange(false)}
                                    disabled={status === "loading"}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    type="submit"
                                    className="flex-1 bg-amber-700 text-white hover:bg-amber-800"
                                    disabled={status === "loading" || !preferredDate || !preferredTime}
                                >
                                    {status === "loading" ? "Sending…" : "Send Request"}
                                </Button>
                            </div>
                        </form>
                    )}
                </DialogContent>
            </Dialog>
        </>
    );
}
