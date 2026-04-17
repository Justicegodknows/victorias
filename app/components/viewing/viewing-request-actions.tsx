'use client';

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

type Props = {
    requestId: string;
    currentStatus: string;
};

export function ViewingRequestActions({ requestId, currentStatus }: Props): React.ReactElement {
    const router = useRouter();
    const [pending, startTransition] = useTransition();
    const [note, setNote] = useState("");
    const [error, setError] = useState("");

    async function respond(status: "confirmed" | "declined"): Promise<void> {
        setError("");
        startTransition(async () => {
            const res = await fetch("/api/viewing-requests", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id: requestId, status, landlord_note: note || undefined }),
            });
            if (!res.ok) {
                const body = (await res.json()) as { error?: string };
                setError(body.error ?? "Failed to update request");
            } else {
                router.refresh();
            }
        });
    }

    if (currentStatus !== "pending") return <></>;

    return (
        <div className="mt-4 flex flex-col gap-3">
            <Textarea
                placeholder="Optional note to the tenant (e.g. confirmed time, directions)…"
                rows={2}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                disabled={pending}
            />
            {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
            <div className="flex gap-3">
                <Button
                    className="flex-1 bg-green-700 text-white hover:bg-green-800"
                    onClick={() => respond("confirmed")}
                    disabled={pending}
                >
                    Confirm
                </Button>
                <Button
                    variant="outline"
                    className="flex-1 border-red-300 text-red-700 hover:bg-red-50 dark:border-red-700 dark:text-red-400"
                    onClick={() => respond("declined")}
                    disabled={pending}
                >
                    Decline
                </Button>
            </div>
        </div>
    );
}
