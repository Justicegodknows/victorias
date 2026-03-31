import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/app/lib/types";
import { NEIGHBORHOODS, CITY_LABELS, APARTMENT_TYPE_LABELS } from "@/app/lib/data/neighborhoods";
import type { NeighborhoodInfo } from "@/app/lib/data/neighborhoods";
import { formatNaira } from "@/app/lib/ai/affordability";

function getServiceClient(): ReturnType<typeof createClient<Database>> {
    return createClient<Database>(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );
}

// ============================================================
// Apartment → text document for embedding
// ============================================================

type ApartmentRow = Database["public"]["Tables"]["apartments"]["Row"];

type ApartmentWithRelations = ApartmentRow & {
    apartment_amenities: Array<{ amenity: string }>;
    environmental_factors: {
        flood_risk: string;
        power_supply_rating: number;
        water_supply_rating: number;
        security_rating: number;
        road_condition_rating: number;
        nearest_bus_stop: string | null;
        nearest_market: string | null;
        nearest_hospital: string | null;
        traffic_notes: string | null;
    } | null;
};

function ratingLabel(rating: number): string {
    const labels = ["Very Poor", "Poor", "Average", "Good", "Excellent"];
    return labels[Math.max(0, Math.min(4, rating - 1))] ?? "Unknown";
}

/**
 * Convert an apartment record (with relations) into a rich text document for embedding.
 */
export function apartmentToDocument(apt: ApartmentWithRelations): string {
    const amenities = apt.apartment_amenities.map((a) => a.amenity.replace(/_/g, " ")).join(", ");
    const cityLabel = CITY_LABELS[apt.city as keyof typeof CITY_LABELS] ?? apt.city;
    const typeLabel =
        APARTMENT_TYPE_LABELS[apt.apartment_type as keyof typeof APARTMENT_TYPE_LABELS] ??
        apt.apartment_type;

    let doc = `${apt.title} — ${typeLabel} in ${apt.neighborhood}, ${cityLabel}.\n`;
    doc += `Annual Rent: ${formatNaira(apt.annual_rent)}. `;
    doc += `Total Upfront Cost: ${formatNaira(apt.total_upfront_cost)}.\n`;
    doc += `Address: ${apt.address}, ${apt.lga}, ${cityLabel}.\n`;
    doc += `Description: ${apt.description}\n`;

    if (amenities) {
        doc += `Amenities: ${amenities}.\n`;
    }

    const env = apt.environmental_factors;
    if (env) {
        doc += `Environmental Factors: `;
        doc += `Flood risk ${env.flood_risk}. `;
        doc += `Power supply ${ratingLabel(env.power_supply_rating)}. `;
        doc += `Water supply ${ratingLabel(env.water_supply_rating)}. `;
        doc += `Security ${ratingLabel(env.security_rating)}. `;
        doc += `Road condition ${ratingLabel(env.road_condition_rating)}.\n`;
        if (env.nearest_bus_stop) doc += `Nearest bus stop: ${env.nearest_bus_stop}. `;
        if (env.nearest_market) doc += `Nearest market: ${env.nearest_market}. `;
        if (env.nearest_hospital) doc += `Nearest hospital: ${env.nearest_hospital}. `;
        if (env.traffic_notes) doc += `Traffic: ${env.traffic_notes}.`;
        doc += "\n";
    }

    return doc.trim();
}

/**
 * Fetch all available apartments with relations and build documents.
 */
export async function fetchApartmentDocuments(): Promise<
    Array<{ apartment_id: string; content: string; metadata: Record<string, unknown> }>
> {
    const supabase = getServiceClient();

    const { data, error } = await supabase
        .from("apartments")
        .select(`
            *,
            apartment_amenities(amenity),
            environmental_factors(*)
        `)
        .eq("is_available", true);

    if (error || !data) {
        throw new Error(`Failed to fetch apartments: ${error?.message ?? "no data"}`);
    }

    return data.map((apt) => ({
        apartment_id: apt.id,
        content: apartmentToDocument(apt as unknown as ApartmentWithRelations),
        metadata: {
            city: apt.city,
            neighborhood: apt.neighborhood,
            apartment_type: apt.apartment_type,
            annual_rent: apt.annual_rent,
        },
    }));
}

/**
 * Fetch a single apartment document by ID.
 */
export async function fetchApartmentDocument(
    apartmentId: string,
): Promise<{ apartment_id: string; content: string; metadata: Record<string, unknown> } | null> {
    const supabase = getServiceClient();

    const { data, error } = await supabase
        .from("apartments")
        .select(`
            *,
            apartment_amenities(amenity),
            environmental_factors(*)
        `)
        .eq("id", apartmentId)
        .single();

    if (error || !data) return null;

    return {
        apartment_id: data.id,
        content: apartmentToDocument(data as unknown as ApartmentWithRelations),
        metadata: {
            city: data.city,
            neighborhood: data.neighborhood,
            apartment_type: data.apartment_type,
            annual_rent: data.annual_rent,
        },
    };
}

// ============================================================
// Neighborhood → text document for embedding
// ============================================================

function formatRentRange(
    rent: Record<string, { min: number; max: number } | null>,
): string {
    return Object.entries(rent)
        .filter(([, range]) => range !== null)
        .map(
            ([type, range]) =>
                `${type}: ${formatNaira(range!.min)} – ${formatNaira(range!.max)}`,
        )
        .join("; ");
}

export function neighborhoodToDocument(n: NeighborhoodInfo): string {
    const cityLabel = CITY_LABELS[n.city] ?? n.city;

    let doc = `Neighborhood: ${n.name}, ${cityLabel} (${n.lga} LGA).\n`;
    doc += `${n.description}\n`;
    doc += `Typical Rent Ranges: ${formatRentRange(n.typical_rent)}.\n`;
    doc += `Pros: ${n.pros.join(", ")}.\n`;
    doc += `Cons: ${n.cons.join(", ")}.\n`;
    doc += `Flood Risk: ${n.flood_risk}. `;
    doc += `Power Reliability: ${ratingLabel(n.power_reliability)}. `;
    doc += `Security: ${ratingLabel(n.security_level)}. `;
    doc += `Traffic: ${ratingLabel(n.traffic_severity)}.\n`;
    doc += `Nearby hubs: ${n.nearby_hubs.join(", ")}.\n`;

    return doc.trim();
}

/**
 * Build text documents from all static neighborhood data.
 */
export function buildNeighborhoodDocuments(): Array<{
    source_type: string;
    source_id: string;
    content: string;
    metadata: Record<string, unknown>;
}> {
    return NEIGHBORHOODS.map((n) => ({
        source_type: "neighborhood",
        source_id: `${n.city}:${n.name.toLowerCase().replace(/\s+/g, "-")}`,
        content: neighborhoodToDocument(n),
        metadata: { city: n.city, name: n.name, lga: n.lga },
    }));
}
