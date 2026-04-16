import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/app/lib/supabase/server";
import { predictRentalCost } from "@/app/lib/ai/ml-client";
import { buildRentalRequest } from "@/app/lib/ai/ml-adapter";
import type { City, ApartmentType } from "@/app/lib/types";

type PredictRequestBody = {
    city: City;
    neighborhood: string;
    apartment_type: ApartmentType;
    amenities: string[];
    power_supply_rating?: number;
};

const VALID_CITIES: City[] = ["lagos", "abuja", "port-harcourt"];
const VALID_APARTMENT_TYPES: ApartmentType[] = [
    "self-contained",
    "mini-flat",
    "1-bedroom",
    "2-bedroom",
    "3-bedroom",
    "duplex",
];

export async function POST(req: Request): Promise<Response> {
    const supabase = await createSupabaseServer();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let body: unknown;
    try {
        body = await req.json();
    } catch {
        return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    if (
        typeof body !== "object" ||
        body === null ||
        typeof (body as Record<string, unknown>).city !== "string" ||
        typeof (body as Record<string, unknown>).neighborhood !== "string" ||
        typeof (body as Record<string, unknown>).apartment_type !== "string" ||
        !Array.isArray((body as Record<string, unknown>).amenities)
    ) {
        return NextResponse.json(
            { error: "Required: city, neighborhood, apartment_type, amenities" },
            { status: 400 },
        );
    }

    const { city, neighborhood, apartment_type, amenities, power_supply_rating } =
        body as PredictRequestBody;

    if (!VALID_CITIES.includes(city)) {
        return NextResponse.json({ error: `city must be one of: ${VALID_CITIES.join(", ")}` }, { status: 400 });
    }

    if (!VALID_APARTMENT_TYPES.includes(apartment_type)) {
        return NextResponse.json(
            { error: `apartment_type must be one of: ${VALID_APARTMENT_TYPES.join(", ")}` },
            { status: 400 },
        );
    }

    if (!neighborhood.trim()) {
        return NextResponse.json({ error: "neighborhood must not be empty" }, { status: 400 });
    }

    const mlRequest = buildRentalRequest({
        city,
        neighborhood: neighborhood.trim(),
        apartment_type,
        annual_rent: 0, // not used by rental-cost prediction
        amenities: amenities.filter((a) => typeof a === "string"),
        power_supply_rating:
            typeof power_supply_rating === "number" ? power_supply_rating : undefined,
    });

    const result = await predictRentalCost(mlRequest);

    if (!result.ok) {
        return NextResponse.json({ ok: false, error: result.error }, { status: 502 });
    }

    return NextResponse.json({
        ok: true,
        annual_rent_ngn: result.data.annual_rent_ngn,
        monthly_rent_ngn: result.data.monthly_rent_ngn,
        latency_ms: result.latency_ms,
    });
}
