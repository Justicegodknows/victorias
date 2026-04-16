/**
 * Adapter layer: maps our Supabase apartment data shapes to ML API request formats.
 *
 * The ML model requires many features our schema doesn't store explicitly. This
 * module derives them from what we have using sensible domain-specific defaults.
 */

import type { ApartmentType, City } from "@/app/lib/types";
import { NEIGHBORHOODS } from "@/app/lib/data/neighborhoods";
import type { MlRentalRequest, MlClassificationRequest, MlAllRequest } from "@/app/lib/ai/ml-client";

// ─── ML model name normalisation ─────────────────────────────────────────────

/** Map app city slugs → ML model display names */
const CITY_TO_ML: Record<City, string> = {
    lagos: "Lagos",
    abuja: "Abuja",
    "port-harcourt": "Port Harcourt",
};

/** ML model's full list of valid neighborhoods */
const ML_VALID_NEIGHBORHOODS = new Set([
    "Agege", "Ajah", "Alimosho", "Asokoro", "Badagry", "Banana Island",
    "Benin City Central", "Calabar Central", "Chevron", "Enugu Central", "Epe",
    "Festac", "Garki", "Gbagada", "Gwarinpa", "Ibadan Central", "Ikeja GRA",
    "Ikorodu", "Ikotun", "Ikoyi", "Isolo", "Jabi", "Kano Central", "Karu",
    "Kubwa", "Lekki Phase 1", "Lekki Phase 2", "Lugbe", "Magodo", "Maitama",
    "Nyanya", "Ojo", "Old Ikoyi", "Oniru", "Osborne Foreshore", "Owerri Central",
    "Parkview", "Port Harcourt Central", "Surulere", "Uyo Central", "VGC",
    "Victoria Island", "Wuse", "Wuse 2", "Yaba",
]);

/** Explicit overrides for app names that don't match ML names exactly */
const NEIGHBORHOOD_TO_ML: Record<string, string> = {
    "Ikeja": "Ikeja GRA",
    "GRA Phase 2": "Port Harcourt Central",
    "Rumuodara": "Port Harcourt Central",
    "Woji": "Port Harcourt Central",
};

/** City-level fallback neighborhoods when no match can be found */
const CITY_DEFAULT_NEIGHBORHOOD: Record<City, string> = {
    lagos: "Surulere",
    abuja: "Garki",
    "port-harcourt": "Port Harcourt Central",
};

/**
 * Normalise a free-form neighborhood string to one the ML model accepts.
 * Strategy: exact set match → explicit override → case-insensitive partial match → city default.
 */
function normalizeNeighborhood(neighborhood: string, city: City): string {
    const trimmed = neighborhood.trim();

    // 1. Already a valid ML neighborhood (exact, case-sensitive)
    if (ML_VALID_NEIGHBORHOODS.has(trimmed)) return trimmed;

    // 2. Explicit override map
    if (NEIGHBORHOOD_TO_ML[trimmed]) return NEIGHBORHOOD_TO_ML[trimmed];

    // 3. Case-insensitive partial match against ML set
    const lower = trimmed.toLowerCase();
    for (const valid of ML_VALID_NEIGHBORHOODS) {
        if (valid.toLowerCase().includes(lower) || lower.includes(valid.toLowerCase())) {
            return valid;
        }
    }

    // 4. City-level fallback
    return CITY_DEFAULT_NEIGHBORHOOD[city];
}

// ─── Apartment-type estimations ──────────────────────────────────────────────

const BEDROOMS_BY_TYPE: Record<ApartmentType, number> = {
    "self-contained": 0,
    "mini-flat": 1,
    "1-bedroom": 1,
    "2-bedroom": 2,
    "3-bedroom": 3,
    duplex: 4,
};

const BATHROOMS_BY_TYPE: Record<ApartmentType, number> = {
    "self-contained": 1,
    "mini-flat": 1,
    "1-bedroom": 1,
    "2-bedroom": 2,
    "3-bedroom": 3,
    duplex: 4,
};

/** Typical size in sqm for each Nigerian apartment type. */
const SIZE_SQM_BY_TYPE: Record<ApartmentType, number> = {
    "self-contained": 25,
    "mini-flat": 40,
    "1-bedroom": 55,
    "2-bedroom": 80,
    "3-bedroom": 110,
    duplex: 170,
};

// ─── Electricity derivation ──────────────────────────────────────────────────

/** Convert power_supply_rating (1–5) to estimated % electricity access. */
function powerRatingToElecPct(rating: number): { mean: number; min: number } {
    const map: Record<number, { mean: number; min: number }> = {
        1: { mean: 20, min: 10 },
        2: { mean: 40, min: 25 },
        3: { mean: 60, min: 45 },
        4: { mean: 80, min: 65 },
        5: { mean: 95, min: 85 },
    };
    return map[Math.round(Math.max(1, Math.min(5, rating)))] ?? { mean: 60, min: 45 };
}

/** City-level electricity population totals (static estimates). */
const CITY_ELEC: Record<City, { population: number; electrified: number }> = {
    lagos: { population: 17_230_908, electrified: 16_165_395 },
    abuja: { population: 3_700_000, electrified: 3_200_000 },
    "port-harcourt": { population: 2_300_000, electrified: 1_900_000 },
};

// ─── Amenity scoring ─────────────────────────────────────────────────────────

/**
 * Quality weights for each amenity type (0–100 scale).
 * Higher = more valuable / premium amenity.
 */
const AMENITY_WEIGHTS: Record<string, number> = {
    prepaid_meter: 90,
    generator: 85,
    security: 80,
    fenced_compound: 75,
    gate_man: 70,
    parking: 70,
    kitchen_cabinet: 65,
    wardrobe: 60,
    water_supply: 75,
    pop_ceiling: 55,
    tiled_floor: 55,
    balcony: 50,
};

function computeAmenityScores(amenities: string[]): {
    amenity_count: number;
    amenity_median_value: number;
    amenity_mean_value: number;
    amenity_grade: string;
} {
    const count = amenities.length;

    if (count === 0) {
        return {
            amenity_count: 0,
            amenity_median_value: 30,
            amenity_mean_value: 30,
            amenity_grade: "A",
        };
    }

    const values = amenities.map((a) => AMENITY_WEIGHTS[a] ?? 50).sort((a, b) => a - b);
    const mean = values.reduce((s, v) => s + v, 0) / values.length;
    const mid = Math.floor(values.length / 2);
    const medianValue =
        values.length % 2 === 0 ? (values[mid - 1] + values[mid]) / 2 : values[mid];

    // The Railway ML model was trained with grade "A" only; any other value causes a 422 error.
    const grade = "A";

    return {
        amenity_count: count,
        amenity_median_value: Math.round(medianValue * 10) / 10,
        amenity_mean_value: Math.round(mean * 10) / 10,
        amenity_grade: grade,
    };
}

// ─── Neighborhood quality defaults ───────────────────────────────────────────

type NeighborhoodQualityScores = {
    hotspot_median_value: number;
    hotspot_mean_value: number;
    hotspot_grade: string;
    inspection_median_value: number;
    inspection_mean_value: number;
    inspection_grade: string;
    title_median_value: number;
    title_mean_value: number;
    title_grade: string;
    service_median_value: number;
    service_mean_value: number;
    service_grade: string;
    construction_median_value: number;
    construction_mean_value: number;
    construction_grade: string;
    land_dispute_median_value: number;
    land_dispute_mean_value: number;
    land_dispute_grade: string;
};

// The Railway ML model was trained with grade "A" only across all grade fields.
// Sending any other value causes a 422 validation error, so we always return "A".
function scoreToGrade(_score: number): string {
    return "A";
}

function deriveNeighborhoodQuality(
    neighborhood: string,
    city: City,
): NeighborhoodQualityScores {
    const match = NEIGHBORHOODS.find(
        (n) =>
            n.city === city &&
            n.name.toLowerCase().includes(neighborhood.toLowerCase()),
    );

    // Security → inspection/service proxy; power → construction proxy; flood → land_dispute proxy
    const securityRaw = match ? match.security_level * 20 : 50;
    const powerRaw = match ? match.power_reliability * 20 : 50;
    const floodPenalty =
        match?.flood_risk === "high" ? 25 : match?.flood_risk === "medium" ? 12 : 0;
    const trafficPenalty = match ? (match.traffic_severity - 1) * 5 : 10;

    const hotspot = Math.max(10, Math.min(100, securityRaw - trafficPenalty));
    const inspection = Math.max(10, Math.min(100, securityRaw - 5));
    const title = Math.max(10, Math.min(100, 80 - floodPenalty));
    const service = Math.max(10, Math.min(100, powerRaw - 10));
    const construction = Math.max(10, Math.min(100, powerRaw));
    const landDispute = Math.max(10, Math.min(100, 75 - floodPenalty));

    return {
        hotspot_median_value: hotspot,
        hotspot_mean_value: Math.round((hotspot - 1) * 10) / 10,
        hotspot_grade: scoreToGrade(hotspot),
        inspection_median_value: inspection,
        inspection_mean_value: Math.round((inspection - 1) * 10) / 10,
        inspection_grade: scoreToGrade(inspection),
        title_median_value: title,
        title_mean_value: Math.round((title - 1) * 10) / 10,
        title_grade: scoreToGrade(title),
        service_median_value: service,
        service_mean_value: Math.round((service - 1) * 10) / 10,
        service_grade: scoreToGrade(service),
        construction_median_value: construction,
        construction_mean_value: Math.round((construction - 1) * 10) / 10,
        construction_grade: scoreToGrade(construction),
        land_dispute_median_value: landDispute,
        land_dispute_mean_value: Math.round((landDispute - 1) * 10) / 10,
        land_dispute_grade: scoreToGrade(landDispute),
    };
}

// ─── Public adapter functions ─────────────────────────────────────────────────

export type ApartmentFeatures = {
    city: City;
    neighborhood: string;
    apartment_type: ApartmentType;
    annual_rent: number;
    amenities: string[];
    power_supply_rating?: number;
    /** Rental aggregate stats from the LGA RPI, if available */
    rental_annual_median?: number;
    rental_monthly_median?: number;
    rental_count?: number;
    age_years?: number;
};

/** Build a minimal rental-cost request from apartment features. */
export function buildRentalRequest(features: ApartmentFeatures): MlRentalRequest {
    const elecPct = powerRatingToElecPct(features.power_supply_rating ?? 3);
    const elec = CITY_ELEC[features.city] ?? CITY_ELEC.lagos;
    const amenityScores = computeAmenityScores(features.amenities);
    const now = new Date();
    const mlCity = CITY_TO_ML[features.city];
    const mlNeighborhood = normalizeNeighborhood(features.neighborhood, features.city);

    return {
        city: mlCity,
        neighborhood: mlNeighborhood,
        listing_year: now.getFullYear(),
        listing_month: now.getMonth() + 1,
        amenity_count: amenityScores.amenity_count,
        amenity_median_value: amenityScores.amenity_median_value,
        amenity_mean_value: amenityScores.amenity_mean_value,
        amenity_grade: amenityScores.amenity_grade,
        elec_access_pct_mean: elecPct.mean,
        elec_access_pct_min: elecPct.min,
        elec_population_total: elec.population,
        elec_electrified_total: elec.electrified,
    };
}

/** Build the full classification / all-predictions request from apartment features. */
export function buildClassificationRequest(features: ApartmentFeatures): MlClassificationRequest {
    const elecPct = powerRatingToElecPct(features.power_supply_rating ?? 3);
    const elec = CITY_ELEC[features.city] ?? CITY_ELEC.lagos;
    const amenityScores = computeAmenityScores(features.amenities);
    const neighborhoodQuality = deriveNeighborhoodQuality(features.neighborhood, features.city);
    const sizeEstimate = SIZE_SQM_BY_TYPE[features.apartment_type] ?? 80;
    const now = new Date();
    const mlCity = CITY_TO_ML[features.city];
    const mlNeighborhood = normalizeNeighborhood(features.neighborhood, features.city);

    const rentalAnnualMedian = features.rental_annual_median ?? features.annual_rent;
    const rentalMonthlyMedian =
        features.rental_monthly_median ?? Math.round(features.annual_rent / 12);
    const rentalCount = features.rental_count ?? 10;

    return {
        city: mlCity,
        neighborhood: mlNeighborhood,
        listing_year: now.getFullYear(),
        listing_month: now.getMonth() + 1,
        bedrooms: BEDROOMS_BY_TYPE[features.apartment_type] ?? 1,
        bathrooms: BATHROOMS_BY_TYPE[features.apartment_type] ?? 1,
        size_sqm: sizeEstimate,
        age_years: features.age_years ?? 5,
        price_per_sqm: Math.round(features.annual_rent / sizeEstimate),
        amenity_count: amenityScores.amenity_count,
        rental_annual_median: rentalAnnualMedian,
        rental_monthly_median: rentalMonthlyMedian,
        rental_count: rentalCount,
        ...neighborhoodQuality,
        amenity_median_value: amenityScores.amenity_median_value,
        amenity_mean_value: amenityScores.amenity_mean_value,
        amenity_grade: amenityScores.amenity_grade,
        elec_access_pct_mean: elecPct.mean,
        elec_access_pct_min: elecPct.min,
        elec_population_total: elec.population,
        elec_electrified_total: elec.electrified,
    };
}

/** Build an all-predictions request (same shape as classification). */
export function buildAllRequest(features: ApartmentFeatures): MlAllRequest {
    return buildClassificationRequest(features);
}
