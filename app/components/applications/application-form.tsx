'use client';

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type Props = {
    apartmentId: string;
    apartmentTitle: string;
    apartmentPpid: string;
    annualRent: number;
};

type EmploymentStatus = "employed" | "self-employed" | "student" | "unemployed";

type FormState = {
    employmentStatus: EmploymentStatus | "";
    employerName: string;
    monthlyIncome: string;
    numOccupants: string;
    proposedMoveIn: string;
    reasonForMoving: string;
    notes: string;
};

function formatNaira(n: number): string {
    return new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 }).format(n);
}

export function ApplicationForm({ apartmentId, apartmentTitle, apartmentPpid, annualRent }: Props): React.ReactElement {
    const router = useRouter();

    const today = new Date().toISOString().split("T")[0];

    const [form, setForm] = useState<FormState>({
        employmentStatus: "",
        employerName: "",
        monthlyIncome: "",
        numOccupants: "1",
        proposedMoveIn: "",
        reasonForMoving: "",
        notes: "",
    });

    const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
    const [errorMsg, setErrorMsg] = useState("");

    function set<K extends keyof FormState>(key: K, value: FormState[K]): void {
        setForm((prev) => ({ ...prev, [key]: value }));
    }

    const showEmployer = form.employmentStatus === "employed" || form.employmentStatus === "self-employed";

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>): Promise<void> {
        e.preventDefault();
        if (!form.employmentStatus || !form.proposedMoveIn) return;

        setStatus("loading");
        setErrorMsg("");

        const payload = {
            apartment_id: apartmentId,
            employment_status: form.employmentStatus,
            employer_name: form.employerName || undefined,
            monthly_income_ngn: form.monthlyIncome ? parseInt(form.monthlyIncome, 10) : undefined,
            num_occupants: parseInt(form.numOccupants, 10),
            proposed_move_in_date: form.proposedMoveIn,
            reason_for_moving: form.reasonForMoving || undefined,
            notes: form.notes || undefined,
        };

        try {
            const res = await fetch("/api/rental-applications", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            if (!res.ok) {
                const body = (await res.json()) as { error?: string };
                throw new Error(body.error ?? "Submission failed");
            }

            router.push("/tenant/viewings");
        } catch (err) {
            setStatus("error");
            setErrorMsg(err instanceof Error ? err.message : "Something went wrong. Please try again.");
        }
    }

    return (
        <div className="mx-auto w-full max-w-2xl">
            {/* Header */}
            <div className="mb-8">
                <span className="font-mono text-[#7b5d43] dark:text-amber-400 uppercase tracking-[0.3em] font-bold text-[10px]">
                    Rental Application
                </span>
                <h1 className="font-(family-name:--font-geist-sans) text-2xl font-bold text-[#2a221d] dark:text-zinc-50 mt-2">
                    {apartmentTitle}
                </h1>
                <p className="text-xs font-mono uppercase tracking-[0.2em] text-zinc-400 mt-0.5">{apartmentPpid}</p>
                <p className="text-sm text-[#6a5e54] dark:text-zinc-400 mt-1">
                    Annual rent: <span className="font-bold text-[#7b5d43] dark:text-amber-400">{formatNaira(annualRent)}</span>
                </p>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-6">
                {/* Section: Employment */}
                <fieldset className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 flex flex-col gap-5">
                    <legend className="px-2 text-xs font-bold uppercase tracking-[0.2em] text-zinc-400">
                        Employment &amp; Income
                    </legend>

                    <div className="flex flex-col gap-1.5">
                        <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                            Employment status <span className="text-red-500">*</span>
                        </label>
                        <Select
                            required
                            value={form.employmentStatus}
                            onValueChange={(v) => set("employmentStatus", v as EmploymentStatus)}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Select status…" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="employed">Employed</SelectItem>
                                <SelectItem value="self-employed">Self-employed / Business owner</SelectItem>
                                <SelectItem value="student">Student</SelectItem>
                                <SelectItem value="unemployed">Unemployed</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {showEmployer && (
                        <div className="flex flex-col gap-1.5">
                            <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                                Employer / Business name
                            </label>
                            <Input
                                type="text"
                                placeholder="e.g. Access Bank, Dangote Group"
                                value={form.employerName}
                                onChange={(e) => set("employerName", e.target.value)}
                            />
                        </div>
                    )}

                    <div className="flex flex-col gap-1.5">
                        <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                            Monthly income (₦) <span className="text-zinc-400 font-normal">optional</span>
                        </label>
                        <Input
                            type="number"
                            min={0}
                            step={1000}
                            placeholder="e.g. 350000"
                            value={form.monthlyIncome}
                            onChange={(e) => set("monthlyIncome", e.target.value)}
                        />
                    </div>
                </fieldset>

                {/* Section: Tenancy details */}
                <fieldset className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 flex flex-col gap-5">
                    <legend className="px-2 text-xs font-bold uppercase tracking-[0.2em] text-zinc-400">
                        Tenancy Details
                    </legend>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="flex flex-col gap-1.5">
                            <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                                Number of occupants <span className="text-red-500">*</span>
                            </label>
                            <Input
                                type="number"
                                min={1}
                                max={20}
                                required
                                value={form.numOccupants}
                                onChange={(e) => set("numOccupants", e.target.value)}
                            />
                        </div>

                        <div className="flex flex-col gap-1.5">
                            <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                                Proposed move-in date <span className="text-red-500">*</span>
                            </label>
                            <Input
                                type="date"
                                min={today}
                                required
                                value={form.proposedMoveIn}
                                onChange={(e) => set("proposedMoveIn", e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="flex flex-col gap-1.5">
                        <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                            Reason for moving <span className="text-zinc-400 font-normal">optional</span>
                        </label>
                        <Textarea
                            placeholder="e.g. Relocating for work, current lease expiring…"
                            rows={2}
                            value={form.reasonForMoving}
                            onChange={(e) => set("reasonForMoving", e.target.value)}
                        />
                    </div>
                </fieldset>

                {/* Section: Additional notes */}
                <fieldset className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 flex flex-col gap-5">
                    <legend className="px-2 text-xs font-bold uppercase tracking-[0.2em] text-zinc-400">
                        Additional Notes
                    </legend>
                    <div className="flex flex-col gap-1.5">
                        <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                            Message to landlord <span className="text-zinc-400 font-normal">optional</span>
                        </label>
                        <Textarea
                            placeholder="Anything else you'd like the landlord to know…"
                            rows={3}
                            value={form.notes}
                            onChange={(e) => set("notes", e.target.value)}
                        />
                    </div>
                </fieldset>

                {errorMsg && (
                    <div className="rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 px-4 py-3 text-sm text-red-700 dark:text-red-400">
                        {errorMsg}
                    </div>
                )}

                <div className="flex gap-3 pb-4">
                    <Button
                        type="button"
                        variant="outline"
                        className="flex-1"
                        onClick={() => router.back()}
                        disabled={status === "loading"}
                    >
                        Cancel
                    </Button>
                    <Button
                        type="submit"
                        className="flex-1 bg-[#7b5d43] text-white hover:bg-[#d78f45] transition-colors font-bold"
                        disabled={status === "loading" || !form.employmentStatus || !form.proposedMoveIn}
                    >
                        {status === "loading" ? "Submitting…" : "Submit Application"}
                    </Button>
                </div>
            </form>
        </div>
    );
}
