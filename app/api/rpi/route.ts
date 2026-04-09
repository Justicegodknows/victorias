import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createSupabaseServer } from "@/app/lib/supabase/server";
import {
    getSupabaseServiceRoleKey,
    getSupabaseUrl,
} from "@/app/lib/supabase/server-env";
import type { Database } from "@/app/lib/types";

function getServiceClient(): ReturnType<typeof createClient<Database>> {
    return createClient<Database>(
        getSupabaseUrl(),
        getSupabaseServiceRoleKey(),
    );
}

export async function GET(req: Request): Promise<Response> {
    const supabase = await createSupabaseServer();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);

    const city = searchParams.get("city");
    const lga = searchParams.get("lga");
    const apartmentType = searchParams.get("apartment_type") ?? "all";
    const yearParam = searchParams.get("year");
    const monthParam = searchParams.get("month");

    if (!city || !lga) {
        return NextResponse.json(
            { error: "city and lga are required query parameters" },
            { status: 400 },
        );
    }

    const year = yearParam ? Number.parseInt(yearParam, 10) : null;
    const month = monthParam ? Number.parseInt(monthParam, 10) : null;

    if ((yearParam && Number.isNaN(year)) || (monthParam && Number.isNaN(month))) {
        return NextResponse.json({ error: "year and month must be valid numbers" }, { status: 400 });
    }

    const service = getServiceClient();
    const { data, error } = await service.rpc("get_lga_rpi", {
        p_city: city,
        p_lga: lga,
        p_apartment_type: apartmentType,
        p_year: year,
        p_month: month,
    });

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, data: data ?? [] });
}

export async function POST(req: Request): Promise<Response> {
    const supabase = await createSupabaseServer();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const configuredKey = process.env.RPI_RECOMPUTE_KEY;
    if (configuredKey) {
        const providedKey = req.headers.get("x-rpi-recompute-key");
        if (!providedKey || providedKey !== configuredKey) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }
    }

    const body = (await req.json()) as {
        year?: number;
        month?: number;
        city?: string;
        lga?: string;
        apartment_type?: string;
    };

    const service = getServiceClient();
    const { data, error } = await service.rpc("compute_lga_rpi", {
        target_year: body.year,
        target_month: body.month,
        filter_city: body.city ?? null,
        filter_lga: body.lga ?? null,
        filter_apartment_type: body.apartment_type ?? "all",
    });

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, rows_affected: data ?? 0 });
}
