"use client";

import * as React from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";

export type RpiBadgeData = {
    city: string;
    lga: string;
    rpi_value: number;
    year: number;
    month: number;
    trend: "up" | "down" | "stable";
    trend_percent: number;
    hist_component: number | null;
    comp_component: number | null;
    inflation_component: number;
    sample_size_hist: number;
    sample_size_comp: number;
};

function formatNaira(value: number): string {
    return "₦" + Math.round(value).toLocaleString("en-NG");
}

function TrendArrow({
    trend,
    trend_percent,
    size = "sm",
}: {
    trend: "up" | "down" | "stable";
    trend_percent: number;
    size?: "sm" | "xs";
}): React.ReactElement {
    if (trend === "stable" || trend_percent === 0) {
        return (
            <span
                className={
                    size === "xs"
                        ? "text-[9px] font-bold text-zinc-400"
                        : "text-[10px] font-bold text-zinc-400"
                }
            >
                — stable
            </span>
        );
    }

    const isUp = trend === "up";
    const colorClass = isUp
        ? "text-red-500 dark:text-red-400"
        : "text-amber-600 dark:text-amber-400";
    const arrow = isUp ? "↑" : "↓";
    const label = `${arrow} ${Math.abs(trend_percent).toFixed(1)}%`;

    return (
        <span
            className={
                `font-bold ${colorClass} ` +
                (size === "xs" ? "text-[9px]" : "text-[10px]")
            }
        >
            {label}
        </span>
    );
}

function ComponentBar({
    label,
    value,
    total,
    colorClass,
}: {
    label: string;
    value: number | null;
    total: number;
    colorClass: string;
}): React.ReactElement | null {
    if (!value) return null;
    const pct = total > 0 ? Math.min(100, (value / total) * 100) : 0;
    return (
        <div className="space-y-1">
            <div className="flex justify-between items-baseline">
                <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-zinc-500 dark:text-zinc-400">
                    {label}
                </span>
                <span className="text-[11px] font-black text-[#2a221d] dark:text-zinc-100">
                    {formatNaira(value)}
                </span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
                <div
                    className={`h-full rounded-full ${colorClass} transition-all duration-500`}
                    style={{ width: `${pct}%` }}
                />
            </div>
        </div>
    );
}

export function RpiBadge({ data }: { data: RpiBadgeData }): React.ReactElement {
    const period = `${String(data.month).padStart(2, "0")}/${data.year}`;
    const totalSamples = data.sample_size_hist + data.sample_size_comp;
    const confidence =
        totalSamples >= 30 ? "high" : totalSamples >= 12 ? "medium" : "low";
    const confidenceColor =
        confidence === "high"
            ? "text-amber-600 dark:text-amber-400"
            : confidence === "medium"
                ? "text-amber-600 dark:text-amber-400"
                : "text-zinc-400";

    const maxComponent = Math.max(
        data.hist_component ?? 0,
        data.comp_component ?? 0,
    );

    return (
        <Dialog>
            <DialogTrigger
                render={
                    <button
                        type="button"
                        className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 dark:bg-amber-900/30 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.15em] text-amber-700 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/50 transition-colors cursor-pointer"
                        title="View RPI details"
                    />
                }
            >
                <span>LGA RPI {formatNaira(data.rpi_value)}</span>
                <TrendArrow trend={data.trend} trend_percent={data.trend_percent} size="xs" />
                <span className="text-zinc-400">·</span>
                <span className="text-zinc-400 font-normal">{period}</span>
            </DialogTrigger>
            <DialogContent className="max-w-sm">
                <DialogHeader>
                    <DialogTitle className="text-base font-black text-[#2a221d] dark:text-zinc-50">
                        {data.lga} — Rental Price Index
                    </DialogTitle>
                </DialogHeader>

                {/* Hero value */}
                <div className="rounded-2xl bg-amber-50/80 dark:bg-amber-950/40 border border-amber-100 dark:border-amber-900/40 p-4 flex items-start justify-between">
                    <div>
                        <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-amber-700 dark:text-amber-400">
                            Market RPI
                        </p>
                        <p className="mt-1 text-2xl font-black text-amber-800 dark:text-amber-300">
                            {formatNaira(data.rpi_value)}
                        </p>
                        <p className="text-[10px] text-amber-700/70 dark:text-amber-400/70 mt-0.5">
                            {period} · all apartment types
                        </p>
                    </div>
                    <div className="flex flex-col items-end gap-1 pt-0.5">
                        <TrendArrow trend={data.trend} trend_percent={data.trend_percent} />
                        <span className={`text-[9px] font-bold uppercase tracking-wider ${confidenceColor}`}>
                            {confidence} confidence
                        </span>
                    </div>
                </div>

                {/* Component breakdown */}
                <div className="space-y-3">
                    <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-zinc-400">
                        Index Components
                    </p>
                    <ComponentBar
                        label={`Historical median (${data.sample_size_hist} txns)`}
                        value={data.hist_component}
                        total={maxComponent}
                        colorClass="bg-amber-500"
                    />
                    <ComponentBar
                        label={`Current comparables (${data.sample_size_comp} listings)`}
                        value={data.comp_component}
                        total={maxComponent}
                        colorClass="bg-violet-500"
                    />
                    <div className="pt-1 flex justify-between items-center rounded-xl bg-zinc-50 dark:bg-zinc-900 px-3 py-2">
                        <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-zinc-400">
                            Monthly inflation factor
                        </span>
                        <span className="text-[11px] font-black text-[#2a221d] dark:text-zinc-100">
                            {(data.inflation_component * 100).toFixed(3)}%
                        </span>
                    </div>
                </div>

                {/* Weight legend */}
                <div className="rounded-xl border border-zinc-100 dark:border-zinc-800 p-3 space-y-1.5">
                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400 mb-2">
                        Formula Weights
                    </p>
                    {[
                        { label: "Historical transactions", weight: "60%", color: "bg-amber-500" },
                        { label: "Comparable listings", weight: "30%", color: "bg-violet-500" },
                        { label: "Prior month smoothing", weight: "10%", color: "bg-zinc-300 dark:bg-zinc-600" },
                    ].map((w) => (
                        <div key={w.label} className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${w.color}`} />
                            <span className="text-[10px] text-zinc-500 dark:text-zinc-400 flex-1">{w.label}</span>
                            <span className="text-[10px] font-black text-zinc-700 dark:text-zinc-300">{w.weight}</span>
                        </div>
                    ))}
                </div>

                <p className="text-[9px] text-zinc-400 dark:text-zinc-500 leading-relaxed">
                    RPI is an AI-computed benchmark using inflation-adjusted rental history, current market comparables, and prior-month smoothing. It indicates the fair market rent for this LGA — not a guaranteed price.
                </p>
            </DialogContent>
        </Dialog>
    );
}
