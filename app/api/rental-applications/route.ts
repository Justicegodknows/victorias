import { createSupabaseServer } from "@/app/lib/supabase/server";
import type { ApplicationEmploymentStatus } from "@/app/lib/types";

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

    const {
        apartment_id,
        employment_status,
        employer_name,
        monthly_income_ngn,
        num_occupants,
        proposed_move_in_date,
        reason_for_moving,
        notes,
    } = body as Record<string, unknown>;

    if (
        typeof apartment_id !== "string" ||
        typeof employment_status !== "string" ||
        !["employed", "self-employed", "student", "unemployed"].includes(employment_status) ||
        typeof num_occupants !== "number" ||
        num_occupants < 1 ||
        typeof proposed_move_in_date !== "string"
    ) {
        return Response.json(
            { error: "apartment_id, employment_status, num_occupants, and proposed_move_in_date are required" },
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
        return Response.json({ error: "Apartment is no longer available" }, { status: 409 });
    }

    const { data, error } = await supabase
        .from("rental_applications")
        .insert({
            tenant_id: user.id,
            apartment_id: apartment_id,
            employment_status: employment_status as ApplicationEmploymentStatus,
            employer_name: typeof employer_name === "string" && employer_name.trim() ? employer_name.trim() : null,
            monthly_income_ngn: typeof monthly_income_ngn === "number" && monthly_income_ngn >= 0 ? monthly_income_ngn : null,
            num_occupants: num_occupants,
            proposed_move_in_date: proposed_move_in_date,
            reason_for_moving: typeof reason_for_moving === "string" && reason_for_moving.trim() ? reason_for_moving.trim() : null,
            notes: typeof notes === "string" && notes.trim() ? notes.trim() : null,
        })
        .select()
        .single();

    if (error) {
        if (error.code === "23505") {
            return Response.json(
                { error: "You have already applied for this apartment" },
                { status: 409 },
            );
        }
        return Response.json({ error: error.message }, { status: 500 });
    }

    return Response.json(data, { status: 201 });
}
