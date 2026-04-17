import { createSupabaseServer } from "@/app/lib/supabase/server";
import type { ViewingRequestTime } from "@/app/lib/types";

// POST /api/viewing-requests — tenant submits a new viewing request
export async function POST(req: Request): Promise<Response> {
    const supabase = await createSupabaseServer();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    let body: unknown;
    try {
        body = await req.json();
    } catch {
        return Response.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const { apartment_id, preferred_date, preferred_time, message } = body as {
        apartment_id?: unknown;
        preferred_date?: unknown;
        preferred_time?: unknown;
        message?: unknown;
    };

    if (
        typeof apartment_id !== "string" ||
        typeof preferred_date !== "string" ||
        typeof preferred_time !== "string" ||
        !["morning", "afternoon", "evening"].includes(preferred_time)
    ) {
        return Response.json(
            { error: "apartment_id, preferred_date, and preferred_time (morning|afternoon|evening) are required" },
            { status: 400 },
        );
    }

    // Verify apartment exists and is available
    const { data: apartment, error: aptError } = await supabase
        .from("apartments")
        .select("id, is_available")
        .eq("id", apartment_id)
        .single();

    if (aptError || !apartment) {
        return Response.json({ error: "Apartment not found" }, { status: 404 });
    }

    if (!apartment.is_available) {
        return Response.json({ error: "Apartment is not available" }, { status: 409 });
    }

    const { data, error } = await supabase
        .from("viewing_requests")
        .insert({
            tenant_id: user.id,
            apartment_id: apartment_id,
            preferred_date: preferred_date,
            preferred_time: preferred_time as ViewingRequestTime,
            message: typeof message === "string" && message.trim() ? message.trim() : null,
        })
        .select()
        .single();

    if (error) {
        if (error.code === "23505") {
            return Response.json(
                { error: "You already have an active viewing request for this apartment" },
                { status: 409 },
            );
        }
        return Response.json({ error: error.message }, { status: 500 });
    }

    return Response.json(data, { status: 201 });
}

// PATCH /api/viewing-requests — landlord responds, or tenant cancels
export async function PATCH(req: Request): Promise<Response> {
    const supabase = await createSupabaseServer();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    let body: unknown;
    try {
        body = await req.json();
    } catch {
        return Response.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const { id, status, landlord_note } = body as {
        id?: unknown;
        status?: unknown;
        landlord_note?: unknown;
    };

    if (typeof id !== "string" || typeof status !== "string") {
        return Response.json({ error: "id and status are required" }, { status: 400 });
    }

    const allowed = ["confirmed", "declined", "cancelled"];
    if (!allowed.includes(status)) {
        return Response.json(
            { error: "status must be one of: confirmed, declined, cancelled" },
            { status: 400 },
        );
    }

    const { data, error } = await supabase
        .from("viewing_requests")
        .update({
            status: status as "confirmed" | "declined" | "cancelled",
            landlord_note: typeof landlord_note === "string" && landlord_note.trim() ? landlord_note.trim() : undefined,
        })
        .eq("id", id)
        .select()
        .single();

    if (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }

    return Response.json(data);
}
