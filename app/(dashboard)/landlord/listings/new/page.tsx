"use client";

import { useState } from "react";
import { createSupabaseBrowser } from "@/app/lib/supabase/client";
import { useRouter } from "next/navigation";
import type { City, ApartmentType, Amenity, FloodRisk, Rating } from "@/app/lib/types";
import {
    APARTMENT_TYPE_LABELS,
    AMENITY_LABELS,
    CITY_LABELS,
} from "@/app/lib/data/neighborhoods";

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
    const supabase = createSupabaseBrowser();
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
        <div className="mx-auto w-full max-w-2xl px-4 py-8">
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">New Listing</h1>

            {/* Step indicator */}
            <div className="mt-6 flex gap-1">
                {([1, 2, 3, 4, 5] as Step[]).map((s) => (
                    <button
                        key={s}
                        type="button"
                        onClick={() => setStep(s)}
                        className={`flex-1 rounded-full py-1.5 text-xs font-medium transition-colors ${s === step
                            ? "bg-green-600 text-white"
                            : s < step
                                ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-400"
                                : "bg-zinc-100 text-zinc-400 dark:bg-zinc-800"
                            }`}
                    >
                        {STEPS[s]}
                    </button>
                ))}
            </div>

            {error && (
                <div className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
                    {error}
                </div>
            )}

            <div className="mt-6 space-y-4">
                {/* Step 1: Basic Info */}
                {step === 1 && (
                    <>
                        <div>
                            <label htmlFor="title" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">Title</label>
                            <input id="title" type="text" required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g., Spacious 2-bedroom in Lekki Phase 1" className="mt-1 block w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-50" />
                        </div>
                        <div>
                            <label htmlFor="type" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">Apartment Type</label>
                            <select id="type" value={apartmentType} onChange={(e) => setApartmentType(e.target.value as ApartmentType)} className="mt-1 block w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-50">
                                {Object.entries(APARTMENT_TYPE_LABELS).map(([val, label]) => (
                                    <option key={val} value={val}>{label}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label htmlFor="rent" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">Annual Rent (₦)</label>
                            <input id="rent" type="number" required value={annualRent} onChange={(e) => setAnnualRent(e.target.value)} placeholder="e.g., 1500000" className="mt-1 block w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-50" />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label htmlFor="deposit" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">Caution Deposit (₦)</label>
                                <input id="deposit" type="number" value={deposit} onChange={(e) => setDeposit(e.target.value)} placeholder="0" className="mt-1 block w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-50" />
                            </div>
                            <div>
                                <label htmlFor="agentFee" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">Agent Fee (₦)</label>
                                <input id="agentFee" type="number" value={agentFee} onChange={(e) => setAgentFee(e.target.value)} placeholder="0" className="mt-1 block w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-50" />
                            </div>
                        </div>
                        <div>
                            <label htmlFor="description" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">Description</label>
                            <textarea id="description" rows={4} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Describe the apartment, its features, and the surrounding area..." className="mt-1 block w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-50" />
                        </div>
                    </>
                )}

                {/* Step 2: Location */}
                {step === 2 && (
                    <>
                        <div>
                            <label htmlFor="city" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">City</label>
                            <select id="city" value={city} onChange={(e) => setCity(e.target.value as City)} className="mt-1 block w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-50">
                                {Object.entries(CITY_LABELS).map(([val, label]) => (
                                    <option key={val} value={val}>{label}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label htmlFor="lga" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">Local Government Area (LGA)</label>
                            <input id="lga" type="text" value={lga} onChange={(e) => setLga(e.target.value)} placeholder="e.g., Eti-Osa" className="mt-1 block w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-50" />
                        </div>
                        <div>
                            <label htmlFor="neighborhood" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">Neighborhood</label>
                            <input id="neighborhood" type="text" value={neighborhood} onChange={(e) => setNeighborhood(e.target.value)} placeholder="e.g., Lekki Phase 1" className="mt-1 block w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-50" />
                        </div>
                        <div>
                            <label htmlFor="address" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">Full Address</label>
                            <input id="address" type="text" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="e.g., 15 Admiralty Way, Lekki Phase 1" className="mt-1 block w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-50" />
                        </div>
                    </>
                )}

                {/* Step 3: Amenities */}
                {step === 3 && (
                    <div>
                        <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Select available amenities</p>
                        <div className="mt-3 grid grid-cols-2 gap-2">
                            {(Object.entries(AMENITY_LABELS) as [Amenity, string][]).map(([key, label]) => (
                                <label
                                    key={key}
                                    className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2.5 text-sm transition-colors ${amenities.has(key)
                                        ? "border-green-600 bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-400"
                                        : "border-zinc-200 text-zinc-600 hover:border-zinc-300 dark:border-zinc-700 dark:text-zinc-400"
                                        }`}
                                >
                                    <input type="checkbox" checked={amenities.has(key)} onChange={() => toggleAmenity(key)} className="sr-only" />
                                    <span className={`flex h-4 w-4 items-center justify-center rounded border text-[10px] ${amenities.has(key)
                                        ? "border-green-600 bg-green-600 text-white"
                                        : "border-zinc-300 dark:border-zinc-600"
                                        }`}>
                                        {amenities.has(key) && "✓"}
                                    </span>
                                    {label}
                                </label>
                            ))}
                        </div>
                    </div>
                )}

                {/* Step 4: Environmental */}
                {step === 4 && (
                    <>
                        <div>
                            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">Flood Risk</label>
                            <div className="mt-2 flex gap-2">
                                {(["low", "medium", "high"] as FloodRisk[]).map((risk) => (
                                    <button key={risk} type="button" onClick={() => setFloodRisk(risk)} className={`flex-1 rounded-lg border py-2 text-sm font-medium capitalize transition-colors ${floodRisk === risk
                                        ? risk === "low" ? "border-green-600 bg-green-50 text-green-700" :
                                            risk === "medium" ? "border-amber-600 bg-amber-50 text-amber-700" :
                                                "border-red-600 bg-red-50 text-red-700"
                                        : "border-zinc-200 text-zinc-500 dark:border-zinc-700 dark:text-zinc-400"
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
                                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">{label} Rating</label>
                                <div className="mt-2 flex gap-1">
                                    {([1, 2, 3, 4, 5] as const).map((rating) => (
                                        <button key={rating} type="button" onClick={() => setter(rating)} className={`h-8 w-10 rounded text-sm font-medium transition-colors ${rating <= value ? "bg-green-600 text-white" : "bg-zinc-100 text-zinc-400 dark:bg-zinc-800"
                                            }`}>
                                            {rating}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        ))}
                        <div>
                            <label htmlFor="busStop" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">Nearest Bus Stop</label>
                            <input id="busStop" type="text" value={nearestBusStop} onChange={(e) => setNearestBusStop(e.target.value)} className="mt-1 block w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-50" />
                        </div>
                        <div>
                            <label htmlFor="market" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">Nearest Market</label>
                            <input id="market" type="text" value={nearestMarket} onChange={(e) => setNearestMarket(e.target.value)} className="mt-1 block w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-50" />
                        </div>
                        <div>
                            <label htmlFor="hospital" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">Nearest Hospital</label>
                            <input id="hospital" type="text" value={nearestHospital} onChange={(e) => setNearestHospital(e.target.value)} className="mt-1 block w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-50" />
                        </div>
                        <div>
                            <label htmlFor="traffic" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">Traffic Notes</label>
                            <textarea id="traffic" rows={2} value={trafficNotes} onChange={(e) => setTrafficNotes(e.target.value)} placeholder="Any traffic-related info..." className="mt-1 block w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-50" />
                        </div>
                    </>
                )}

                {/* Step 5: Photos */}
                {step === 5 && (
                    <div>
                        <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Upload Photos (max 10)</p>
                        <p className="mt-1 text-xs text-zinc-500">First photo will be the primary/cover image. JPEG, PNG, or WebP. Max 5MB each.</p>
                        <label className="mt-3 flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-zinc-300 p-8 transition-colors hover:border-green-500 dark:border-zinc-600">
                            <svg className="h-8 w-8 text-zinc-400" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.41a2.25 2.25 0 013.182 0l2.909 2.91m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                            </svg>
                            <span className="mt-2 text-sm text-zinc-500">Click to select photos</span>
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
                            <div className="mt-4 grid grid-cols-5 gap-2">
                                {imageFiles.map((file, i) => (
                                    <div key={i} className="relative h-20 overflow-hidden rounded-lg bg-zinc-100">
                                        <img src={URL.createObjectURL(file)} alt="" className="h-full w-full object-cover" />
                                        {i === 0 && (
                                            <span className="absolute bottom-1 left-1 rounded bg-green-600 px-1 py-0.5 text-[9px] text-white">
                                                Cover
                                            </span>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* Navigation buttons */}
                <div className="flex justify-between pt-4">
                    {step > 1 ? (
                        <button type="button" onClick={() => setStep((step - 1) as Step)} className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800">
                            Back
                        </button>
                    ) : (
                        <div />
                    )}
                    {step < 5 ? (
                        <button type="button" onClick={() => setStep((step + 1) as Step)} className="rounded-lg bg-green-600 px-6 py-2 text-sm font-medium text-white hover:bg-green-700">
                            Next
                        </button>
                    ) : (
                        <button
                            type="button"
                            onClick={handleSubmit}
                            disabled={loading || uploading || !title || !annualRent}
                            className="rounded-lg bg-green-600 px-6 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
                        >
                            {uploading ? "Uploading photos..." : loading ? "Publishing..." : "Publish Listing"}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
