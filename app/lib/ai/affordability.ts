export type AffordabilityResult = {
    is_affordable: boolean;
    annual_income: number;
    annual_rent: number;
    rent_to_income_ratio: number;
    total_upfront_cost: number;
    upfront_breakdown: {
        annual_rent: number;
        deposit: number;
        agent_fee: number;
        agreement_fee: number;
    };
    recommendation: string;
    /** ML model price-tier classification, when available. */
    ml_price_tier?: string;
    /** ML model price-tier probabilities, when available. */
    ml_price_tier_probabilities?: Record<string, number>;
};

const AGREEMENT_FEE_ESTIMATE = 100_000; // ₦100k average

export function calculateAffordability(
    annual_income: number,
    annual_rent: number,
    deposit: number,
    agent_fee: number,
): AffordabilityResult {
    const rent_to_income_ratio = annual_rent / annual_income;
    const total_upfront_cost = annual_rent + deposit + agent_fee + AGREEMENT_FEE_ESTIMATE;

    let recommendation: string;
    if (rent_to_income_ratio <= 0.25) {
        recommendation = "Excellent fit — this apartment is well within your budget.";
    } else if (rent_to_income_ratio <= 0.30) {
        recommendation = "Good fit — this is affordable but leaves moderate room for other expenses.";
    } else if (rent_to_income_ratio <= 0.40) {
        recommendation = "Stretch — this apartment takes a significant portion of your income. Consider carefully.";
    } else {
        recommendation = "Not recommended — this apartment would consume too much of your income. Consider a more affordable option.";
    }

    return {
        is_affordable: rent_to_income_ratio <= 0.30,
        annual_income,
        annual_rent,
        rent_to_income_ratio: Math.round(rent_to_income_ratio * 100) / 100,
        total_upfront_cost,
        upfront_breakdown: {
            annual_rent,
            deposit,
            agent_fee,
            agreement_fee: AGREEMENT_FEE_ESTIMATE,
        },
        recommendation,
    };
}

export function formatNaira(amount: number): string {
    return `₦${amount.toLocaleString("en-NG")}`;
}

export const INCOME_BRACKETS = [
    { label: "Entry level", min: 1_200_000, max: 2_400_000, recommended_max_rent: 720_000 },
    { label: "Mid level", min: 2_400_000, max: 6_000_000, recommended_max_rent: 1_800_000 },
    { label: "Senior level", min: 6_000_000, max: 12_000_000, recommended_max_rent: 3_600_000 },
    { label: "Executive", min: 12_000_000, max: 50_000_000, recommended_max_rent: 15_000_000 },
] as const;
