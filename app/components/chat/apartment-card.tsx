import { APARTMENT_TYPE_LABELS, AMENITY_LABELS } from "@/app/lib/data/neighborhoods";

export type ApartmentCardData = {
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
        <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-700 dark:bg-zinc-800">
            {/* Image */}
            {primaryImage && (
                <div className="h-36 w-full bg-zinc-200 dark:bg-zinc-700">
                    <img
                        src={primaryImage}
                        alt={apartment.title}
                        className="h-full w-full object-cover"
                    />
                </div>
            )}

            <div className="p-3">
                {/* Title and price */}
                <div className="flex items-start justify-between gap-2">
                    <div>
                        <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                            {apartment.title}
                        </h3>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400">
                            {APARTMENT_TYPE_LABELS[apartment.apartment_type as keyof typeof APARTMENT_TYPE_LABELS] ?? apartment.apartment_type}
                            {" · "}
                            {apartment.neighborhood}, {apartment.city}
                        </p>
                    </div>
                    <div className="text-right">
                        <p className="text-sm font-bold text-green-600">{apartment.annual_rent}/yr</p>
                        <p className="text-[10px] text-zinc-500 dark:text-zinc-400">
                            Upfront: {apartment.total_upfront_cost}
                        </p>
                    </div>
                </div>

                {/* Amenities */}
                {amenities.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                        {amenities.slice(0, 5).map((amenity) => (
                            <span
                                key={amenity}
                                className="rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-medium text-zinc-600 dark:bg-zinc-700 dark:text-zinc-300"
                            >
                                {AMENITY_LABELS[amenity] ?? amenity}
                            </span>
                        ))}
                        {amenities.length > 5 && (
                            <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] text-zinc-500 dark:bg-zinc-700 dark:text-zinc-400">
                                +{amenities.length - 5} more
                            </span>
                        )}
                    </div>
                )}

                {/* Environmental quick stats */}
                {envFactors && (
                    <div className="mt-2 flex gap-3 border-t border-zinc-100 pt-2 text-[10px] text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
                        <span>⚡ Power: {envFactors.power_supply_rating}/5</span>
                        <span>🔒 Security: {envFactors.security_rating}/5</span>
                        <span>🌊 Flood: {envFactors.flood_risk}</span>
                    </div>
                )}

                {/* Description preview */}
                {apartment.description && (
                    <p className="mt-2 line-clamp-2 text-xs text-zinc-600 dark:text-zinc-400">
                        {apartment.description}
                    </p>
                )}
            </div>
        </div>
    );
}
