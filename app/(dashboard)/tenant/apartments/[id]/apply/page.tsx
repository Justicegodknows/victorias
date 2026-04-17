import { createSupabaseServer } from "@/app/lib/supabase/server";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ApplicationForm } from "@/app/components/applications/application-form";

export default async function ApplyPage({
    params,
}: {
    params: Promise<{ id: string }>;
}): Promise<React.ReactElement> {
    const { id } = await params;
    const supabase = await createSupabaseServer();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) redirect("/login");

    type ApartmentBasic = {
        id: string;
        ppid: string;
        title: string;
        annual_rent: number;
        is_available: boolean;
    };

    const { data: apartment } = await supabase
        .from("apartments")
        .select("id, ppid, title, annual_rent, is_available")
        .eq("id", id)
        .single()
        .overrideTypes<ApartmentBasic, { merge: false }>();

    if (!apartment) notFound();

    // Check if tenant already has an application for this apartment
    const { data: existing } = await supabase
        .from("rental_applications")
        .select("id, status")
        .eq("tenant_id", user.id)
        .eq("apartment_id", id)
        .maybeSingle();

    return (
        <div className="mx-auto w-full max-w-2xl">
            <Link
                href={`/tenant/apartments/${id}`}
                className="mb-6 inline-flex items-center gap-2 text-sm text-[#6a5e54] dark:text-zinc-400 hover:text-[#7b5d43] dark:hover:text-amber-400 transition-colors font-medium"
            >
                ← Back to apartment
            </Link>

            {existing ? (
                <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-8 text-center">
                    <p className="text-3xl mb-3">📋</p>
                    <p className="font-semibold text-zinc-900 dark:text-zinc-50">Application already submitted</p>
                    <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                        You already applied for <span className="font-medium">{apartment.title}</span>.
                        Current status: <span className="font-semibold capitalize">{existing.status.replace("_", " ")}</span>.
                    </p>
                    <Link
                        href="/tenant/viewings"
                        className="mt-6 inline-block bg-[#7b5d43] text-white px-6 py-3 rounded-xl text-sm font-bold hover:bg-[#d78f45] transition-colors"
                    >
                        View my applications
                    </Link>
                </div>
            ) : (
                <ApplicationForm
                    apartmentId={apartment.id}
                    apartmentTitle={apartment.title}
                    apartmentPpid={apartment.ppid}
                    annualRent={apartment.annual_rent}
                />
            )}
        </div>
    );
}
