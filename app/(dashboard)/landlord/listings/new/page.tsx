"use client";

import { useEffect, useMemo, useState } from "react";
import { createSupabaseBrowser } from "@/app/lib/supabase/client";
import { useRouter } from "next/navigation";
import type { City, ApartmentType, Amenity, FloodRisk, Rating } from "@/app/lib/types";
import {
    APARTMENT_TYPE_LABELS,
    AMENITY_LABELS,
    CITY_LABELS,
} from "@/app/lib/data/neighborhoods";
import { formatNaira } from "@/app/lib/ai/affordability";
import { buildRentRecommendation, type RentRecommendation } from "@/app/lib/ai/rent-recommendation";

type Step = 1 | 2 | 3 | 4 | 5;

const STEPS: Record<Step, string> = {
    1: "Basic Info",
    2: "Location",
    3: "Amenities",
    4: "Environment",
    5: "Photos",
};

export default function NewListingPage(): React.ReactElement {
    const router = useRouter();
    const supabase = useMemo(() => createSupabaseBrowser(), []);
    const [step, setStep] = useState<Step>(1);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Step 1 — Basic info
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [apartmentType, setApartmentType] = useState<ApartmentType>("2-bedroom");
    const [annualRent, setAnnualRent] = useState("");
    const [deposit, setDeposit] = useState("");
    const [agentFee, setAgentFee] = useState("");

    // Step 2 — Location
    const [city, setCity] = useState<City>("lagos");
    const [lga, setLga] = useState("");
    const [neighborhood, setNeighborhood] = useState("");
    const [address, setAddress] = useState("");

    // Step 3 — Amenities
    const [amenities, setAmenities] = useState<Set<Amenity>>(new Set());

    // Step 4 — Environmental
    const [floodRisk, setFloodRisk] = useState<FloodRisk>("low");
    const [powerRating, setPowerRating] = useState<Rating>(3);
    const [waterRating, setWaterRating] = useState<Rating>(3);
    const [securityRating, setSecurityRating] = useState<Rating>(3);
    const [roadRating, setRoadRating] = useState<Rating>(3);
    const [nearestBusStop, setNearestBusStop] = useState("");
    const [nearestMarket, setNearestMarket] = useState("");
    const [nearestHospital, setNearestHospital] = useState("");
    const [trafficNotes, setTrafficNotes] = useState("");

    // Step 5 — Photos
    const [imageFiles, setImageFiles] = useState<File[]>([]);
    const [uploading, setUploading] = useState(false);

    // Live pricing guidance
    const [rentRecommendation, setRentRecommendation] = useState<RentRecommendation | null>(null);
    const [recommendationLoading, setRecommendationLoading] = useState(false);

    useEffect(() => {
        const normalizedLga = lga.trim();
        if (normalizedLga.length < 2) {
            setRentRecommendation(null);
            return;
        }

        let isCancelled = false;

        async function fetchRecommendation(): Promise<void> {
            setRecommendationLoading(true);

            type ComparableRentRow = { annual_rent: number };
            const { data: comparableRows } = await supabase
                .from("apartments")
                .select("annual_rent")
                .eq("city", city)
                .ilike("lga", normalizedLga)
                .eq("apartment_type", apartmentType)
                .eq("is_available", true)
                .limit(200)
                .overrideTypes<ComparableRentRow[]>();

            type LgaRpiProbe = {
                rpi_value: number;
                sample_size_hist: number;
                sample_size_comp: number;
            };

            // Prefer apartment-type-specific RPI, fall back to 'all'
            const { data: typeRpiRows } = await supabase
                .from("lga_rpi_monthly")
                .select("rpi_value, sample_size_hist, sample_size_comp")
                .eq("city", city)
                .ilike("lga", normalizedLga)
                .eq("apartment_type", apartmentType)
                .order("year", { ascending: false })
                .order("month", { ascending: false })
                .limit(1)
                .overrideTypes<LgaRpiProbe[]>();

            const rpiRow = typeRpiRows?.[0]
                ? typeRpiRows[0]
                : (await supabase
                    .from("lga_rpi_monthly")
                    .select("rpi_value, sample_size_hist, sample_size_comp")
                    .eq("city", city)
                    .ilike("lga", normalizedLga)
                    .eq("apartment_type", "all")
                    .order("year", { ascending: false })
                    .order("month", { ascending: false })
                    .limit(1)
                    .overrideTypes<LgaRpiProbe[]>()).data?.[0];

            const recommendation = buildRentRecommendation({
                comparableRents: (comparableRows ?? []).map((row) => row.annual_rent),
                rpiValue: rpiRow?.rpi_value,
                rpiSampleSize: (rpiRow?.sample_size_hist ?? 0) + (rpiRow?.sample_size_comp ?? 0),
            });

            if (!isCancelled) {
                setRentRecommendation(recommendation);
                setRecommendationLoading(false);
            }
        }

        fetchRecommendation().catch(() => {
            if (!isCancelled) {
                setRentRecommendation(null);
                setRecommendationLoading(false);
            }
        });

        return () => {
            isCancelled = true;
        };
    }, [apartmentType, city, lga, supabase]);

    const numericAnnualRent = Number.parseInt(annualRent, 10);
    const hasValidAnnualRent = Number.isFinite(numericAnnualRent) && numericAnnualRent > 0;

    function toggleAmenity(amenity: Amenity): void {
        setAmenities((prev) => {
            const next = new Set(prev);
            if (next.has(amenity)) {
                next.delete(amenity);
            } else {
                next.add(amenity);
            }
            return next;
        });
    }

    async function handleSubmit(): Promise<void> {
        setError(null);
        setLoading(true);

        try {
            const {
                data: { user },
            } = await supabase.auth.getUser();
            if (!user) throw new Error("Not authenticated");

            // 1. Create apartment
            const { data: apartment, error: aptError } = await supabase
                .from("apartments")
                .insert({
                    landlord_id: user.id,
                    title,
                    description,
                    apartment_type: apartmentType,
                    annual_rent: parseInt(annualRent, 10),
                    deposit: parseInt(deposit, 10) || 0,
                    agent_fee: parseInt(agentFee, 10) || 0,
                    city,
                    lga,
                    neighborhood,
                    address,
                })
                .select("id")
                .single();

            if (aptError || !apartment) throw new Error(aptError?.message ?? "Failed to create listing");

            // 2. Insert amenities
            if (amenities.size > 0) {
                const { error: amenError } = await supabase.from("apartment_amenities").insert(
                    Array.from(amenities).map((amenity) => ({
                        apartment_id: apartment.id,
                        amenity,
                    })),
                );
                if (amenError) console.error("Amenity insert error:", amenError);
            }

            // 3. Insert environmental factors
            const { error: envError } = await supabase.from("environmental_factors").insert({
                apartment_id: apartment.id,
                flood_risk: floodRisk,
                power_supply_rating: powerRating,
                water_supply_rating: waterRating,
                security_rating: securityRating,
                road_condition_rating: roadRating,
                nearest_bus_stop: nearestBusStop || null,
                nearest_market: nearestMarket || null,
                nearest_hospital: nearestHospital || null,
                traffic_notes: trafficNotes || null,
            });
            if (envError) console.error("Environmental factors insert error:", envError);

            // 4. Upload images
            if (imageFiles.length > 0) {
                setUploading(true);
                for (let i = 0; i < imageFiles.length; i++) {
                    const file = imageFiles[i];
                    const fileExt = file.name.split(".").pop();
                    const filePath = `${user.id}/${apartment.id}/${i}.${fileExt}`;

                    const { error: uploadError } = await supabase.storage
                        .from("apartment-images")
                        .upload(filePath, file);

                    if (uploadError) {
                        console.error("Upload error:", uploadError);
                        continue;
                    }

                    const { data: publicUrl } = supabase.storage
                        .from("apartment-images")
                        .getPublicUrl(filePath);

                    await supabase.from("apartment_images").insert({
                        apartment_id: apartment.id,
                        image_url: publicUrl.publicUrl,
                        is_primary: i === 0,
                        display_order: i,
                    });
                }
                setUploading(false);
            }

            router.push("/landlord");
        } catch (err) {
            setError(err instanceof Error ? err.message : "Something went wrong");
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="mx-auto w-full max-w-4xl">
            <div className="mb-12">
                <h1 className="font-(family-name:--font-geist-sans) text-4xl font-black tracking-tight text-[#2a221d] dark:text-zinc-50 mb-2">Create New Listing</h1>
                <p className="text-[#6a5e54] dark:text-zinc-400 font-medium">Curate your property for Victoria&apos;s premium audience.</p>
            </div>

            {/* Step indicator */}
            <div className="mb-8 flex gap-2">
                {([1, 2, 3, 4, 5] as Step[]).map((s) => (
                    <button
                        key={s}
                        type="button"
                        onClick={() => setStep(s)}
                        className={`flex-1 rounded-full py-2 text-xs font-bold uppercase tracking-widest transition-all ${s === step
                            ? "btn-primary-gradient text-white shadow-[0px_4px_12px_rgba(0,107,44,0.3)]"
                            : s < step
                                ? "bg-[#f3ddc8] dark:bg-amber-900 text-[#7b5d43] dark:text-amber-400"
                                : "bg-[#f8efe7] dark:bg-zinc-800 text-zinc-400"
                            }`}
                    >
                        {STEPS[s]}
                    </button>
                ))}
            </div>

            {error && (
                <div className="mb-6 rounded-2xl bg-red-50 dark:bg-red-950 p-4 text-sm text-red-700 dark:text-red-300">
                    {error}
                </div>
            )}

            <div className="space-y-6">
                {/* Step 1: Basic Info */}
                {step === 1 && (
                    <section className="space-y-6">
                        <div className="flex items-center gap-4 mb-2">
                            <div className="w-10 h-10 rounded-xl bg-[#7b5d43]/10 flex items-center justify-center text-[#7b5d43]">
                                📝
                            </div>
                            <h3 className="text-xl font-(family-name:--font-geist-sans) font-bold text-[#2a221d] dark:text-zinc-50">Basic Information</h3>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-8 bg-[#f8efe7] dark:bg-zinc-900 rounded-3xl">
                            <div className="md:col-span-2">
                                <label htmlFor="title" className="block text-[10px] font-mono uppercase tracking-[0.3em] text-zinc-500 mb-2">Listing Title</label>
                                <input id="title" type="text" required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g., Minimalist Ocean View Villa" className="w-full bg-white dark:bg-zinc-800 border-0 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-[#7b5d43] shadow-sm dark:text-zinc-50" />
                            </div>
                            <div>
                                <label htmlFor="type" className="block text-[10px] font-mono uppercase tracking-[0.3em] text-zinc-500 mb-2">Property Type</label>
                                <select id="type" value={apartmentType} onChange={(e) => setApartmentType(e.target.value as ApartmentType)} className="w-full bg-white dark:bg-zinc-800 border-0 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-[#7b5d43] shadow-sm dark:text-zinc-50">
                                    {Object.entries(APARTMENT_TYPE_LABELS).map(([val, label]) => (
                                        <option key={val} value={val}>{label}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label htmlFor="rent" className="block text-[10px] font-mono uppercase tracking-[0.3em] text-zinc-500 mb-2">Annual Rent (₦)</label>
                                <input id="rent" type="number" required value={annualRent} onChange={(e) => setAnnualRent(e.target.value)} placeholder="e.g., 1500000" className="w-full bg-white dark:bg-zinc-800 border-0 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-[#7b5d43] shadow-sm font-mono dark:text-zinc-50" />
                            </div>
                            <div>
                                <label htmlFor="deposit" className="block text-[10px] font-mono uppercase tracking-[0.3em] text-zinc-500 mb-2">Caution Deposit (₦)</label>
                                <input id="deposit" type="number" value={deposit} onChange={(e) => setDeposit(e.target.value)} placeholder="0" className="w-full bg-white dark:bg-zinc-800 border-0 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-[#7b5d43] shadow-sm font-mono dark:text-zinc-50" />
                            </div>
                            <div>
                                <label htmlFor="agentFee" className="block text-[10px] font-mono uppercase tracking-[0.3em] text-zinc-500 mb-2">Agent Fee (₦)</label>
                                <input id="agentFee" type="number" value={agentFee} onChange={(e) => setAgentFee(e.target.value)} placeholder="0" className="w-full bg-white dark:bg-zinc-800 border-0 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-[#7b5d43] shadow-sm font-mono dark:text-zinc-50" />
                            </div>
                            <div className="md:col-span-2">
                                <label htmlFor="description" className="block text-[10px] font-mono uppercase tracking-[0.3em] text-zinc-500 mb-2">Editorial Description</label>
                                <textarea id="description" rows={4} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Describe the soul of this property..." className="w-full bg-white dark:bg-zinc-800 border-0 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-[#7b5d43] shadow-sm dark:text-zinc-50" />
                            </div>

                            <div className="md:col-span-2">
                                {recommendationLoading ? (
                                    <div className="rounded-2xl border border-amber-100 bg-amber-50/60 px-4 py-3 dark:border-amber-900/40 dark:bg-amber-950/30 text-xs text-amber-700 dark:text-amber-400">
                                        Computing recommended rent range for current city/LGA...
                                    </div>
                                ) : rentRecommendation ? (
                                    <div className="rounded-2xl border border-amber-100 bg-amber-50/60 px-4 py-4 dark:border-amber-900/40 dark:bg-amber-950/30">
                                        <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-amber-700 dark:text-amber-400">Recommended Rent Range</p>
                                        <p className="mt-1 text-sm font-semibold text-amber-900 dark:text-amber-300">
                                            {APARTMENT_TYPE_LABELS[apartmentType]} in {lga.trim() || "selected LGA"}, {CITY_LABELS[city]}: {formatNaira(rentRecommendation.minRent)}-{formatNaira(rentRecommendation.maxRent)}/year
                                        </p>
                                        <p className="mt-1 text-[10px] text-amber-700/80 dark:text-amber-400/80">
                                            Confidence: {rentRecommendation.confidence} · Source: {rentRecommendation.source === "comparables" ? "local comparable listings" : "LGA market index (RPI)"}
                                        </p>
                                        {hasValidAnnualRent && (
                                            <p className={`mt-2 text-[11px] font-bold ${numericAnnualRent < rentRecommendation.minRent
                                                    ? "text-amber-700 dark:text-amber-400"
                                                    : numericAnnualRent > rentRecommendation.maxRent
                                                        ? "text-amber-700 dark:text-amber-400"
                                                        : "text-amber-700 dark:text-amber-400"
                                                }`}>
                                                {numericAnnualRent < rentRecommendation.minRent
                                                    ? "Current asking rent is below the suggested market band."
                                                    : numericAnnualRent > rentRecommendation.maxRent
                                                        ? "Current asking rent is above the suggested market band."
                                                        : "Current asking rent is within the suggested market band."}
                                            </p>
                                        )}
                                    </div>
                                ) : (
                                    <div className="rounded-2xl border border-zinc-200 bg-white px-4 py-3 dark:border-zinc-700 dark:bg-zinc-800 text-xs text-zinc-500 dark:text-zinc-400">
                                        Enter a valid LGA in Step 2 to get a recommended rent range.
                                    </div>
                                )}
                            </div>
                        </div>
                    </section>
                )}

                {/* Step 2: Location */}
                {step === 2 && (
                    <section className="space-y-6">
                        <div className="flex items-center gap-4 mb-2">
                            <div className="w-10 h-10 rounded-xl bg-[#7b5d43]/10 flex items-center justify-center text-[#7b5d43]">
                                📍
                            </div>
                            <h3 className="text-xl font-(family-name:--font-geist-sans) font-bold text-[#2a221d] dark:text-zinc-50">Location Details</h3>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-8 bg-[#f8efe7] dark:bg-zinc-900 rounded-3xl">
                            <div>
                                <label htmlFor="city" className="block text-[10px] font-mono uppercase tracking-[0.3em] text-zinc-500 mb-2">City</label>
                                <select id="city" value={city} onChange={(e) => setCity(e.target.value as City)} className="w-full bg-white dark:bg-zinc-800 border-0 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-[#7b5d43] shadow-sm dark:text-zinc-50">
                                    {Object.entries(CITY_LABELS).map(([val, label]) => (
                                        <option key={val} value={val}>{label}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label htmlFor="lga" className="block text-[10px] font-mono uppercase tracking-[0.3em] text-zinc-500 mb-2">Local Government Area</label>
                                <input id="lga" type="text" value={lga} onChange={(e) => setLga(e.target.value)} placeholder="e.g., Eti-Osa" className="w-full bg-white dark:bg-zinc-800 border-0 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-[#7b5d43] shadow-sm dark:text-zinc-50" />
                            </div>
                            <div>
                                <label htmlFor="neighborhood" className="block text-[10px] font-mono uppercase tracking-[0.3em] text-zinc-500 mb-2">Neighborhood</label>
                                <input id="neighborhood" type="text" value={neighborhood} onChange={(e) => setNeighborhood(e.target.value)} placeholder="e.g., Lekki Phase 1" className="w-full bg-white dark:bg-zinc-800 border-0 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-[#7b5d43] shadow-sm dark:text-zinc-50" />
                            </div>
                            <div>
                                <label htmlFor="address" className="block text-[10px] font-mono uppercase tracking-[0.3em] text-zinc-500 mb-2">Full Address</label>
                                <input id="address" type="text" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="e.g., Banana Island, Road 3" className="w-full bg-white dark:bg-zinc-800 border-0 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-[#7b5d43] shadow-sm dark:text-zinc-50" />
                            </div>
                        </div>

                        {recommendationLoading ? (
                            <div className="rounded-2xl border border-amber-100 bg-amber-50/60 px-4 py-3 dark:border-amber-900/40 dark:bg-amber-950/30 text-xs text-amber-700 dark:text-amber-400">
                                Refreshing market recommendation for {APARTMENT_TYPE_LABELS[apartmentType]} in {CITY_LABELS[city]}...
                            </div>
                        ) : rentRecommendation ? (
                            <div className="rounded-2xl border border-amber-100 bg-amber-50/60 px-4 py-4 dark:border-amber-900/40 dark:bg-amber-950/30">
                                <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-amber-700 dark:text-amber-400">LGA Pricing Guidance</p>
                                <p className="mt-1 text-sm font-semibold text-amber-900 dark:text-amber-300">
                                    Recommended {APARTMENT_TYPE_LABELS[apartmentType]} range in {lga.trim() || "selected LGA"}, {CITY_LABELS[city]}: {formatNaira(rentRecommendation.minRent)}-{formatNaira(rentRecommendation.maxRent)} per year
                                </p>
                            </div>
                        ) : null}
                    </section>
                )}

                {/* Step 3: Amenities */}
                {step === 3 && (
                    <section className="space-y-6">
                        <div className="flex items-center gap-4 mb-2">
                            <div className="w-10 h-10 rounded-xl bg-[#7b5d43]/10 flex items-center justify-center text-[#7b5d43]">
                                🏊
                            </div>
                            <h3 className="text-xl font-(family-name:--font-geist-sans) font-bold text-[#2a221d] dark:text-zinc-50">Premium Amenities</h3>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 p-8 bg-[#f8efe7] dark:bg-zinc-900 rounded-3xl">
                            {(Object.entries(AMENITY_LABELS) as [Amenity, string][]).map(([key, label]) => (
                                <label
                                    key={key}
                                    className="flex items-center gap-3 cursor-pointer group"
                                >
                                    <input
                                        type="checkbox"
                                        checked={amenities.has(key)}
                                        onChange={() => toggleAmenity(key)}
                                        className="w-5 h-5 rounded border-zinc-300 dark:border-zinc-600 text-[#7b5d43] focus:ring-[#7b5d43]"
                                    />
                                    <span className="text-sm font-medium text-[#6a5e54] dark:text-zinc-400 group-hover:text-[#7b5d43] dark:group-hover:text-amber-400 transition-colors">{label}</span>
                                </label>
                            ))}
                        </div>
                    </section>
                )}

                {/* Step 4: Environmental */}
                {step === 4 && (
                    <section className="space-y-6">
                        <div className="flex items-center gap-4 mb-2">
                            <div className="w-10 h-10 rounded-xl bg-[#7b5d43]/10 flex items-center justify-center text-[#7b5d43]">
                                🌿
                            </div>
                            <h3 className="text-xl font-(family-name:--font-geist-sans) font-bold text-[#2a221d] dark:text-zinc-50">Environmental Integrity</h3>
                        </div>
                        <div className="p-8 bg-[#f8efe7] dark:bg-zinc-900 rounded-3xl space-y-6">
                            <div>
                                <label className="block text-[10px] font-mono uppercase tracking-[0.3em] text-zinc-500 mb-3">Flood Risk</label>
                                <div className="flex gap-3">
                                    {(["low", "medium", "high"] as FloodRisk[]).map((risk) => (
                                        <button key={risk} type="button" onClick={() => setFloodRisk(risk)} className={`flex-1 rounded-xl py-3 text-sm font-bold capitalize transition-all ${floodRisk === risk
                                            ? risk === "low" ? "bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 ring-2 ring-amber-500" :
                                                risk === "medium" ? "bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 ring-2 ring-amber-500" :
                                                    "bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 ring-2 ring-red-500"
                                            : "bg-white dark:bg-zinc-800 text-zinc-500"
                                            }`}>
                                            {risk}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            {[
                                { label: "Power Supply", value: powerRating, setter: setPowerRating },
                                { label: "Water Supply", value: waterRating, setter: setWaterRating },
                                { label: "Security", value: securityRating, setter: setSecurityRating },
                                { label: "Road Condition", value: roadRating, setter: setRoadRating },
                            ].map(({ label, value, setter }) => (
                                <div key={label}>
                                    <label className="block text-[10px] font-mono uppercase tracking-[0.3em] text-zinc-500 mb-3">{label}</label>
                                    <div className="flex gap-2">
                                        {([1, 2, 3, 4, 5] as const).map((rating) => (
                                            <button key={rating} type="button" onClick={() => setter(rating)} className={`h-10 w-12 rounded-xl text-sm font-bold transition-all ${rating <= value ? "bg-[#7b5d43] text-white shadow-sm" : "bg-white dark:bg-zinc-800 text-zinc-400"
                                                }`}>
                                                {rating}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            ))}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
                                <div>
                                    <label htmlFor="busStop" className="block text-[10px] font-mono uppercase tracking-[0.3em] text-zinc-500 mb-2">Nearest Bus Stop</label>
                                    <input id="busStop" type="text" value={nearestBusStop} onChange={(e) => setNearestBusStop(e.target.value)} className="w-full bg-white dark:bg-zinc-800 border-0 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-[#7b5d43] shadow-sm dark:text-zinc-50" />
                                </div>
                                <div>
                                    <label htmlFor="market" className="block text-[10px] font-mono uppercase tracking-[0.3em] text-zinc-500 mb-2">Nearest Market</label>
                                    <input id="market" type="text" value={nearestMarket} onChange={(e) => setNearestMarket(e.target.value)} className="w-full bg-white dark:bg-zinc-800 border-0 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-[#7b5d43] shadow-sm dark:text-zinc-50" />
                                </div>
                                <div>
                                    <label htmlFor="hospital" className="block text-[10px] font-mono uppercase tracking-[0.3em] text-zinc-500 mb-2">Nearest Hospital</label>
                                    <input id="hospital" type="text" value={nearestHospital} onChange={(e) => setNearestHospital(e.target.value)} className="w-full bg-white dark:bg-zinc-800 border-0 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-[#7b5d43] shadow-sm dark:text-zinc-50" />
                                </div>
                                <div>
                                    <label htmlFor="traffic" className="block text-[10px] font-mono uppercase tracking-[0.3em] text-zinc-500 mb-2">Traffic Notes</label>
                                    <input id="traffic" type="text" value={trafficNotes} onChange={(e) => setTrafficNotes(e.target.value)} placeholder="Any traffic-related info..." className="w-full bg-white dark:bg-zinc-800 border-0 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-[#7b5d43] shadow-sm dark:text-zinc-50" />
                                </div>
                            </div>
                        </div>
                    </section>
                )}

                {/* Step 5: Photos */}
                {step === 5 && (
                    <section className="space-y-6">
                        <div className="flex items-center gap-4 mb-2">
                            <div className="w-10 h-10 rounded-xl bg-[#7b5d43]/10 flex items-center justify-center text-[#7b5d43]">
                                📸
                            </div>
                            <h3 className="text-xl font-(family-name:--font-geist-sans) font-bold text-[#2a221d] dark:text-zinc-50">Visual Assets</h3>
                        </div>
                        <label className="border-2 border-dashed border-[#bdcaba] dark:border-zinc-600 rounded-3xl p-12 flex flex-col items-center justify-center text-center group hover:border-[#7b5d43] transition-colors cursor-pointer bg-white/50 dark:bg-zinc-800/50">
                            <div className="w-16 h-16 rounded-full bg-[#7b5d43]/5 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                <span className="text-4xl">☁️</span>
                            </div>
                            <p className="text-lg font-(family-name:--font-geist-sans) font-bold text-[#2a221d] dark:text-zinc-50 mb-1">Drag and drop your high-res gallery</p>
                            <p className="text-sm text-zinc-400">First photo will be the cover image. JPEG, PNG, or WebP. Max 5MB each.</p>
                            <input
                                type="file"
                                accept="image/jpeg,image/png,image/webp"
                                multiple
                                className="sr-only"
                                onChange={(e) => {
                                    const files = Array.from(e.target.files ?? []).slice(0, 10);
                                    setImageFiles(files);
                                }}
                            />
                        </label>
                        {imageFiles.length > 0 && (
                            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-4">
                                {imageFiles.map((file, i) => (
                                    <div key={i} className="aspect-square rounded-xl overflow-hidden relative group">
                                        <img src={URL.createObjectURL(file)} alt="" className="h-full w-full object-cover" />
                                        {i === 0 && (
                                            <span className="absolute bottom-2 left-2 rounded-full bg-[#7b5d43] px-2 py-0.5 text-[9px] font-bold text-white">
                                                Cover
                                            </span>
                                        )}
                                    </div>
                                ))}
                                <div className="aspect-square rounded-xl bg-[#efe0d2] dark:bg-zinc-800 flex items-center justify-center">
                                    <span className="text-2xl text-zinc-400">+</span>
                                </div>
                            </div>
                        )}
                    </section>
                )}

                {/* Navigation buttons */}
                <div className="flex justify-between pt-6">
                    {step > 1 ? (
                        <button type="button" onClick={() => setStep((step - 1) as Step)} className="px-6 py-3 text-zinc-500 dark:text-zinc-400 font-medium hover:text-[#2a221d] dark:hover:text-zinc-50 transition-colors">
                            ← Back
                        </button>
                    ) : (
                        <div />
                    )}
                    {step < 5 ? (
                        <button type="button" onClick={() => setStep((step + 1) as Step)} className="bg-[#2a221d] dark:bg-zinc-800 text-white px-8 py-3 rounded-xl font-(family-name:--font-geist-sans) font-bold hover:opacity-90 transition-opacity">
                            Next →
                        </button>
                    ) : (
                        <button
                            type="button"
                            onClick={handleSubmit}
                            disabled={loading || uploading || !title || !annualRent}
                            className="btn-primary-gradient text-white px-8 py-3 rounded-xl font-(family-name:--font-geist-sans) font-bold shadow-lg shadow-[#7b5d43]/20 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50"
                        >
                            {uploading ? "Uploading photos..." : loading ? "Publishing..." : "Publish to Victoria's"}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
