export type RentRecommendationInput = {
    comparableRents: number[];
    rpiValue?: number | null;
    rpiSampleSize?: number;
    /** ML model predicted annual rent, when available. Acts as the primary anchor. */
    mlPrediction?: number | null;
};

export type RentRecommendation = {
    minRent: number;
    maxRent: number;
    anchorRent: number;
    confidence: "high" | "medium" | "low";
    sampleCount: number;
    source: "ml" | "comparables" | "rpi";
};

function median(values: number[]): number {
    const sorted = [...values].sort((a, b) => a - b);
    if (sorted.length === 0) return 0;
    const middle = Math.floor(sorted.length / 2);
    if (sorted.length % 2 === 0) {
        return (sorted[middle - 1] + sorted[middle]) / 2;
    }
    return sorted[middle];
}

function roundToNearest(value: number, unit = 50_000): number {
    return Math.max(unit, Math.round(value / unit) * unit);
}

function resolveConfidence(sampleCount: number, rpiSampleSize: number): "high" | "medium" | "low" {
    const strongest = Math.max(sampleCount, rpiSampleSize);
    if (strongest >= 30 || sampleCount >= 12) return "high";
    if (strongest >= 12 || sampleCount >= 6) return "medium";
    return "low";
}

function resolveSpread(confidence: "high" | "medium" | "low", source: "comparables" | "rpi"): number {
    if (source === "rpi") {
        if (confidence === "high") return 0.25;
        if (confidence === "medium") return 0.3;
        return 0.35;
    }

    if (confidence === "high") return 0.2;
    if (confidence === "medium") return 0.25;
    return 0.3;
}

export function buildRentRecommendation(input: RentRecommendationInput): RentRecommendation | null {
    const comparableRents = input.comparableRents.filter((rent) => Number.isFinite(rent) && rent > 0);
    const sampleCount = comparableRents.length;
    const rpiValue = input.rpiValue ?? null;
    const rpiSampleSize = input.rpiSampleSize ?? 0;
    const mlPrediction = typeof input.mlPrediction === "number" && input.mlPrediction > 0
        ? input.mlPrediction
        : null;

    // ML prediction is the primary anchor — use it when available with a tighter spread
    if (mlPrediction !== null) {
        const confidence = resolveConfidence(sampleCount, rpiSampleSize);
        // ML predictions get a tighter spread than statistical sources
        const spread = confidence === "high" ? 0.15 : confidence === "medium" ? 0.20 : 0.25;
        return {
            minRent: roundToNearest(mlPrediction * (1 - spread)),
            maxRent: roundToNearest(mlPrediction * (1 + spread)),
            anchorRent: roundToNearest(mlPrediction),
            confidence,
            sampleCount,
            source: "ml",
        };
    }

    const hasComparableAnchor = sampleCount >= 4;
    const hasRpiAnchor = typeof rpiValue === "number" && rpiValue > 0;

    if (!hasComparableAnchor && !hasRpiAnchor) {
        return null;
    }

    const source: "comparables" | "rpi" = hasComparableAnchor ? "comparables" : "rpi";
    const anchorRent = hasComparableAnchor ? median(comparableRents) : (rpiValue as number);

    const confidence = resolveConfidence(sampleCount, rpiSampleSize);
    const spread = resolveSpread(confidence, source);

    const minRent = roundToNearest(anchorRent * (1 - spread));
    const maxRent = roundToNearest(anchorRent * (1 + spread));

    return {
        minRent,
        maxRent,
        anchorRent: roundToNearest(anchorRent),
        confidence,
        sampleCount,
        source,
    };
}
