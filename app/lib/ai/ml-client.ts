/**
 * Typed client for the Nigerian Real Estate Prediction ML API.
 *
 * Primary:  Railway  — ML_MODEL_RAILWAY_URL  (fast, always-on)
 * Fallback: Render   — ML_MODEL_BASE_URL     (cold-starts, used when Railway fails)
 *
 * Endpoints:
 *   GET  /health                  — Liveness check
 *   GET  /meta/cities             — Supported cities
 *   GET  /meta/neighborhoods      — Supported neighborhoods
 *   POST /predict/rental-cost     — Regression: predicted annual/monthly rent
 *   POST /predict/property-type   — Classification: property type + probabilities
 *   POST /predict/price-tier      — Classification: price tier + probabilities
 *   POST /predict/all             — All three predictions in one call
 */

const ML_RAILWAY_URL =
    (process.env.ML_MODEL_RAILWAY_URL ?? "").replace(/\/$/, "");

const ML_RENDER_URL =
    (process.env.ML_MODEL_BASE_URL ?? "https://property-price-model.onrender.com").replace(/\/$/, "");

const ML_TIMEOUT_MS = 8000;

// ─── Request schemas ─────────────────────────────────────────────────────────

/** Inputs for the rental-cost regression model (minimal field set). */
export type MlRentalRequest = {
    city: string;
    neighborhood: string;
    listing_year: number;
    listing_month: number;
    amenity_count: number;
    amenity_median_value: number;
    amenity_mean_value: number;
    amenity_grade: string | null;
    elec_access_pct_mean: number;
    elec_access_pct_min: number;
    elec_population_total: number;
    elec_electrified_total: number;
};

/** Inputs for property-type and price-tier classification (full feature set). */
export type MlClassificationRequest = {
    city: string;
    neighborhood: string;
    listing_year: number;
    listing_month: number;
    bedrooms: number;
    bathrooms: number;
    size_sqm: number;
    age_years: number;
    price_per_sqm: number;
    amenity_count: number;
    rental_annual_median: number;
    rental_monthly_median: number;
    rental_count: number;
    hotspot_median_value: number;
    hotspot_mean_value: number;
    hotspot_grade: string | null;
    amenity_median_value: number;
    amenity_mean_value: number;
    amenity_grade: string | null;
    inspection_median_value: number;
    inspection_mean_value: number;
    inspection_grade: string | null;
    title_median_value: number;
    title_mean_value: number;
    title_grade: string | null;
    service_median_value: number;
    service_mean_value: number;
    service_grade: string | null;
    construction_median_value: number;
    construction_mean_value: number;
    construction_grade: string | null;
    land_dispute_median_value: number;
    land_dispute_mean_value: number;
    land_dispute_grade: string | null;
    elec_access_pct_mean: number;
    elec_access_pct_min: number;
    elec_population_total: number;
    elec_electrified_total: number;
};

/** Combined request for all three predictions at once. */
export type MlAllRequest = MlClassificationRequest;

// ─── Response schemas ────────────────────────────────────────────────────────

export type MlRentalResponse = {
    annual_rent_ngn: number;
    monthly_rent_ngn: number;
};

export type MlPropertyTypeResponse = {
    property_type: string;
    probabilities: Record<string, number>;
};

export type MlPriceTierResponse = {
    price_tier: string;
    probabilities: Record<string, number>;
};

export type MlAllResponse = {
    rental: MlRentalResponse;
    property_type: MlPropertyTypeResponse;
    price_tier: MlPriceTierResponse;
};

// ─── Result wrapper ──────────────────────────────────────────────────────────

export type MlResult<T> =
    | { ok: true; data: T; latency_ms: number }
    | { ok: false; error: string; latency_ms: number };

// ─── Internal fetch helpers ───────────────────────────────────────────────────

async function mlFetchFromBase<T>(baseUrl: string, path: string, init?: RequestInit): Promise<MlResult<T>> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), ML_TIMEOUT_MS);
    const startedAt = Date.now();

    try {
        const response = await fetch(`${baseUrl}${path}`, {
            ...init,
            signal: controller.signal,
            headers: {
                "Content-Type": "application/json",
                ...(init?.headers ?? {}),
            },
        });

        const latency_ms = Date.now() - startedAt;

        if (!response.ok) {
            const body = await response.text().catch(() => "");
            return {
                ok: false,
                error: `ML API returned ${response.status}: ${body.slice(0, 300)}`,
                latency_ms,
            };
        }

        const data = (await response.json()) as T;
        return { ok: true, data, latency_ms };
    } catch (error) {
        const latency_ms = Date.now() - startedAt;
        const message =
            error instanceof Error
                ? error.name === "AbortError"
                    ? `ML API timed out after ${ML_TIMEOUT_MS}ms`
                    : error.message
                : "Unknown error";
        return { ok: false, error: message, latency_ms };
    } finally {
        clearTimeout(timeout);
    }
}

/**
 * Try Railway first; if it fails or is not configured, fall back to Render.
 * All public functions go through this so routing is transparent to callers.
 */
async function mlFetch<T>(path: string, init?: RequestInit): Promise<MlResult<T>> {
    if (ML_RAILWAY_URL) {
        const railwayResult = await mlFetchFromBase<T>(ML_RAILWAY_URL, path, init);
        if (railwayResult.ok) {
            return railwayResult;
        }
        console.warn(`[ML] Railway failed (${railwayResult.error}) — falling back to Render`);
    }

    return mlFetchFromBase<T>(ML_RENDER_URL, path, init);
}

// ─── Public API ──────────────────────────────────────────────────────────────

/** Predict annual and monthly rental cost from a minimal feature set. */
export async function predictRentalCost(
    input: MlRentalRequest,
): Promise<MlResult<MlRentalResponse>> {
    return mlFetch<MlRentalResponse>("/predict/rental-cost", {
        method: "POST",
        body: JSON.stringify(input),
    });
}

/** Predict property type (classification) from the full feature set. */
export async function predictPropertyType(
    input: MlClassificationRequest,
): Promise<MlResult<MlPropertyTypeResponse>> {
    return mlFetch<MlPropertyTypeResponse>("/predict/property-type", {
        method: "POST",
        body: JSON.stringify(input),
    });
}

/** Predict price tier (classification) from the full feature set. */
export async function predictPriceTier(
    input: MlClassificationRequest,
): Promise<MlResult<MlPriceTierResponse>> {
    return mlFetch<MlPriceTierResponse>("/predict/price-tier", {
        method: "POST",
        body: JSON.stringify(input),
    });
}

/** Run all three predictions in a single API call. */
export async function predictAll(
    input: MlAllRequest,
): Promise<MlResult<MlAllResponse>> {
    return mlFetch<MlAllResponse>("/predict/all", {
        method: "POST",
        body: JSON.stringify(input),
    });
}

/** Liveness check — probes Railway first, then Render, and reports both. */
export async function checkMlHealth(): Promise<{
    reachable: boolean;
    latency_ms: number | null;
    message: string;
    railway: { configured: boolean; reachable: boolean; latency_ms: number | null };
    render: { reachable: boolean; latency_ms: number | null };
}> {
    const railwayConfigured = Boolean(ML_RAILWAY_URL);

    const [railwayResult, renderResult] = await Promise.all([
        railwayConfigured
            ? mlFetchFromBase<unknown>(ML_RAILWAY_URL, "/health", { method: "GET" })
            : Promise.resolve(null),
        mlFetchFromBase<unknown>(ML_RENDER_URL, "/health", { method: "GET" }),
    ]);

    const railwayOk = railwayResult?.ok ?? false;
    const renderOk = renderResult.ok;
    const reachable = railwayOk || renderOk;

    const primary = railwayOk ? railwayResult! : renderResult;

    return {
        reachable,
        latency_ms: primary.latency_ms,
        message: reachable
            ? railwayOk
                ? `ML model reachable via Railway (${primary.latency_ms}ms).`
                : `Railway unavailable — ML model reachable via Render fallback (${primary.latency_ms}ms).`
            : "ML model unreachable on both Railway and Render.",
        railway: {
            configured: railwayConfigured,
            reachable: railwayOk,
            latency_ms: railwayResult?.latency_ms ?? null,
        },
        render: {
            reachable: renderOk,
            latency_ms: renderResult.latency_ms,
        },
    };
}
