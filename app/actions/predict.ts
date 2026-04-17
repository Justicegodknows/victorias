'use server';

import { createSupabaseServer } from '@/app/lib/supabase/server';


export async function predictAndSave(inputs: Record<string, unknown>) {
    // 1. Call the ML model
    const mlRes = await fetch(`${process.env.ML_API_URL}/predict/all`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(inputs),
    });

    if (!mlRes.ok) {
        throw new Error(`ML API error: ${mlRes.status}`);
    }

    const prediction = await mlRes.json();

    // 2. Save to Supabase as the logged-in user
    const supabase = await createSupabaseServer();
    const { data: { user } } = await supabase.auth.getUser();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any).from('predictions').insert({
        user_id: user?.id ?? null,
        city: inputs.city,
        neighborhood: inputs.neighborhood,
        inputs: inputs,
        annual_rent_ngn: prediction.rental.annual_rent_ngn,
        monthly_rent_ngn: prediction.rental.monthly_rent_ngn,
        property_type: prediction.property_type.property_type,
        probabilities_type: prediction.property_type.probabilities,
        price_tier: prediction.price_tier.price_tier,
        probabilities_tier: prediction.price_tier.probabilities,
    });

    if (error) throw new Error(error.message);

    return prediction;
}
