import { APARTMENT_TYPE_LABELS, AMENITY_LABELS } from "@/app/lib/data/neighborhoods";

export type ApartmentCardData = {
    ppid?: string;
    title: string;
    apartment_type: string;
    annual_rent: string | number;
    total_upfront_cost: string | number;
    city: string;
    neighborhood: string;
    description?: string;
    primary_image?: string | null;
    amenities?: string[];
    environmental_factors?: {
        power_supply_rating: number;
        security_rating: number;
        flood_risk: string;
    } | null;
};

type ApartmentCardProps = {
    apartment: ApartmentCardData;
};

export function ApartmentCard({ apartment }: ApartmentCardProps): React.ReactElement {
    const amenities = apartment.amenities ?? [];
    const primaryImage = apartment.primary_image ?? null;
    const envFactors = apartment.environmental_factors ?? null;

    return (
        <div className="min-w-[280px] w-[320px] bg-white dark:bg-zinc-900 rounded-2xl overflow-hidden shadow-sm flex flex-col shrink-0">
            {/* Image */}
            {primaryImage ? (
                <div className="relative h-44">
                    <img
                        src={primaryImage}
                        alt={apartment.title}
                        className="w-full h-full object-cover"
                    />
                    <div className="absolute top-3 right-3 bg-[#006b2c] text-white text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-tighter">
                        Verified
                    </div>
                </div>
            ) : (
                <div className="h-44 bg-linear-to-br from-emerald-100 to-emerald-50 dark:from-zinc-800 dark:to-zinc-900 flex items-center justify-center">
                    <span className="text-4xl">🏠</span>
                </div>
            )}

            <div className="p-4 flex flex-col gap-3">
                {/* Title */}
                <div>
                    <h4 className="font-(family-name:--font-geist-sans) font-bold text-sm text-zinc-900 dark:text-zinc-50">
                        {apartment.title}
                    </h4>
                    {apartment.ppid && (
                        <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-zinc-400">
                            {apartment.ppid}
                        </p>
                    )}
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                        {apartment.neighborhood}, {apartment.city}
                    </p>
                </div>

                {/* Price */}
                <div className="flex items-end justify-between">
                    <div className="font-mono text-lg font-black text-[#006b2c] dark:text-emerald-400">
                        {apartment.annual_rent}<span className="text-[10px] font-normal text-zinc-400">/yr</span>
                    </div>
                    <div className="text-[10px] text-zinc-400">Upfront: {apartment.total_upfront_cost}</div>
                </div>

                {/* Amenities */}
                {amenities.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                        {amenities.slice(0, 4).map((amenity) => (
                            <span
                                key={amenity}
                                className="px-2 py-1 bg-zinc-100 dark:bg-zinc-800 rounded-full text-[9px] font-semibold text-zinc-600 dark:text-zinc-400"
                            >
                                {AMENITY_LABELS[amenity] ?? amenity}
                            </span>
                        ))}
                    </div>
                )}

                {/* Environmental quick stats */}
                {envFactors && (
                    <div className="grid grid-cols-3 gap-1 pt-2 border-t border-zinc-100 dark:border-zinc-800">
                        <div className="flex flex-col items-center">
                            <span className="text-xs text-emerald-500">⚡</span>
                            <span className="text-[8px] uppercase font-bold text-zinc-400">{envFactors.power_supply_rating}/5 Power</span>
                        </div>
                        <div className="flex flex-col items-center border-x border-zinc-100 dark:border-zinc-800">
                            <span className="text-xs text-emerald-500">🛡️</span>
                            <span className="text-[8px] uppercase font-bold text-zinc-400">{envFactors.security_rating}/5 Sec</span>
                        </div>
                        <div className="flex flex-col items-center">
                            <span className="text-xs text-emerald-500">🌊</span>
                            <span className="text-[8px] uppercase font-bold text-zinc-400">{envFactors.flood_risk}</span>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
