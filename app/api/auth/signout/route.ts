import { createSupabaseServer } from "@/app/lib/supabase/server";
import { redirect } from "next/navigation";

export async function POST(): Promise<Response> {
    const supabase = await createSupabaseServer();
    await supabase.auth.signOut();
    redirect("/login");
}
