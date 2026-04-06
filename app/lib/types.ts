// ---- Enum types for Nigerian real estate domain ----

export type UserRole = "landlord" | "tenant";

export type City = "lagos" | "abuja" | "port-harcourt";

export type ApartmentType =
    | "self-contained"
    | "mini-flat"
    | "1-bedroom"
    | "2-bedroom"
    | "3-bedroom"
    | "duplex";

export type Amenity =
    | "water_supply"
    | "generator"
    | "security"
    | "parking"
    | "prepaid_meter"
    | "pop_ceiling"
    | "tiled_floor"
    | "wardrobe"
    | "kitchen_cabinet"
    | "balcony"
    | "fenced_compound"
    | "gate_man";

export type FloodRisk = "low" | "medium" | "high";

export type InquiryStatus = "pending" | "responded" | "closed";

export type Rating = 1 | 2 | 3 | 4 | 5;

export type GovernmentIdType =
    | "national-id-card"
    | "drivers-license"
    | "international-passport"
    | "voters-card";

// ---- Database row types ----

export type Profile = {
    id: string;
    full_name: string;
    phone: string | null;
    role: UserRole;
    nin: string | null;
    bvn: string | null;
    government_id_type: GovernmentIdType | null;
    government_id_number: string | null;
    income_range: string | null;
    preferred_cities: City[];
    created_at: string;
};

export type Apartment = {
    id: string;
    ppid: string;
    landlord_id: string;
    title: string;
    description: string;
    apartment_type: ApartmentType;
    annual_rent: number;
    deposit: number;
    agent_fee: number;
    total_upfront_cost: number;
    address: string;
    city: City;
    lga: string;
    neighborhood: string;
    latitude: number | null;
    longitude: number | null;
    is_verified: boolean;
    is_available: boolean;
    created_at: string;
    updated_at: string;
};

export type ApartmentAmenity = {
    id: string;
    apartment_id: string;
    amenity: Amenity;
};

export type ApartmentImage = {
    id: string;
    apartment_id: string;
    image_url: string;
    is_primary: boolean;
    display_order: number;
};

export type EnvironmentalFactors = {
    id: string;
    apartment_id: string;
    flood_risk: FloodRisk;
    power_supply_rating: Rating;
    water_supply_rating: Rating;
    security_rating: Rating;
    road_condition_rating: Rating;
    nearest_bus_stop: string | null;
    nearest_market: string | null;
    nearest_hospital: string | null;
    traffic_notes: string | null;
};

export type SavedApartment = {
    id: string;
    tenant_id: string;
    apartment_id: string;
    created_at: string;
};

export type Conversation = {
    id: string;
    tenant_id: string;
    messages: unknown;
    created_at: string;
    updated_at: string;
};

export type Inquiry = {
    id: string;
    tenant_id: string;
    apartment_id: string;
    message: string;
    status: InquiryStatus;
    created_at: string;
};

export type RentalTransaction = {
    id: string;
    apartment_id: string | null;
    city: City;
    lga: string;
    neighborhood: string | null;
    apartment_type: ApartmentType;
    annual_rent: number;
    lease_start_date: string;
    lease_end_date: string | null;
    source: string;
    created_at: string;
};

export type InflationRate = {
    id: string;
    state_code: "LA" | "FC" | "RI";
    year: number;
    month: number;
    monthly_rate: number;
    source: string;
    created_at: string;
};

export type LgaRpiMonthly = {
    id: string;
    city: City;
    state_code: "LA" | "FC" | "RI";
    lga: string;
    apartment_type: "all" | ApartmentType;
    year: number;
    month: number;
    rpi_value: number;
    hist_component: number | null;
    comp_component: number | null;
    inflation_component: number;
    sample_size_hist: number;
    sample_size_comp: number;
    computed_at: string;
};

// ---- Composite types for UI ----

export type ApartmentWithDetails = Apartment & {
    amenities: Amenity[];
    images: ApartmentImage[];
    environmental_factors: EnvironmentalFactors | null;
    landlord: Pick<Profile, "full_name" | "phone"> | null;
};

// ---- Supabase database type helper ----

export type Database = {
    public: {
        Tables: {
            profiles: {
                Row: Profile;
                Insert: Omit<
                    Profile,
                    "created_at" | "phone" | "income_range" | "preferred_cities" | "nin" | "bvn" | "government_id_type" | "government_id_number"
                > & {
                    phone?: string | null;
                    nin?: string | null;
                    bvn?: string | null;
                    government_id_type?: GovernmentIdType | null;
                    government_id_number?: string | null;
                    income_range?: string | null;
                    preferred_cities?: City[];
                };
                Update: Partial<Omit<Profile, "id" | "created_at">>;
                Relationships: [];
            };
            apartments: {
                Row: Apartment;
                Insert: Omit<
                    Apartment,
                    | "id"
                    | "ppid"
                    | "created_at"
                    | "updated_at"
                    | "total_upfront_cost"
                    | "description"
                    | "deposit"
                    | "agent_fee"
                    | "address"
                    | "lga"
                    | "neighborhood"
                    | "latitude"
                    | "longitude"
                    | "is_verified"
                    | "is_available"
                > & {
                    description?: string;
                    deposit?: number;
                    agent_fee?: number;
                    address?: string;
                    lga?: string;
                    neighborhood?: string;
                    latitude?: number | null;
                    longitude?: number | null;
                    is_verified?: boolean;
                    is_available?: boolean;
                };
                Update: Partial<Omit<Apartment, "id" | "landlord_id" | "created_at">>;
                Relationships: [
                    {
                        foreignKeyName: "apartments_landlord_id_fkey";
                        columns: ["landlord_id"];
                        isOneToOne: false;
                        referencedRelation: "profiles";
                        referencedColumns: ["id"];
                    },
                ];
            };
            apartment_amenities: {
                Row: ApartmentAmenity;
                Insert: Omit<ApartmentAmenity, "id">;
                Update: never;
                Relationships: [
                    {
                        foreignKeyName: "apartment_amenities_apartment_id_fkey";
                        columns: ["apartment_id"];
                        isOneToOne: false;
                        referencedRelation: "apartments";
                        referencedColumns: ["id"];
                    },
                ];
            };
            apartment_images: {
                Row: ApartmentImage;
                Insert: Omit<ApartmentImage, "id" | "is_primary" | "display_order"> & {
                    is_primary?: boolean;
                    display_order?: number;
                };
                Update: Partial<Omit<ApartmentImage, "id" | "apartment_id">>;
                Relationships: [
                    {
                        foreignKeyName: "apartment_images_apartment_id_fkey";
                        columns: ["apartment_id"];
                        isOneToOne: false;
                        referencedRelation: "apartments";
                        referencedColumns: ["id"];
                    },
                ];
            };
            environmental_factors: {
                Row: EnvironmentalFactors;
                Insert: Omit<
                    EnvironmentalFactors,
                    | "id"
                    | "flood_risk"
                    | "power_supply_rating"
                    | "water_supply_rating"
                    | "security_rating"
                    | "road_condition_rating"
                    | "nearest_bus_stop"
                    | "nearest_market"
                    | "nearest_hospital"
                    | "traffic_notes"
                > & {
                    flood_risk?: FloodRisk;
                    power_supply_rating?: Rating;
                    water_supply_rating?: Rating;
                    security_rating?: Rating;
                    road_condition_rating?: Rating;
                    nearest_bus_stop?: string | null;
                    nearest_market?: string | null;
                    nearest_hospital?: string | null;
                    traffic_notes?: string | null;
                };
                Update: Partial<Omit<EnvironmentalFactors, "id" | "apartment_id">>;
                Relationships: [
                    {
                        foreignKeyName: "environmental_factors_apartment_id_fkey";
                        columns: ["apartment_id"];
                        isOneToOne: true;
                        referencedRelation: "apartments";
                        referencedColumns: ["id"];
                    },
                ];
            };
            saved_apartments: {
                Row: SavedApartment;
                Insert: Omit<SavedApartment, "id" | "created_at">;
                Update: never;
                Relationships: [
                    {
                        foreignKeyName: "saved_apartments_tenant_id_fkey";
                        columns: ["tenant_id"];
                        isOneToOne: false;
                        referencedRelation: "profiles";
                        referencedColumns: ["id"];
                    },
                    {
                        foreignKeyName: "saved_apartments_apartment_id_fkey";
                        columns: ["apartment_id"];
                        isOneToOne: false;
                        referencedRelation: "apartments";
                        referencedColumns: ["id"];
                    },
                ];
            };
            conversations: {
                Row: Conversation;
                Insert: Omit<Conversation, "id" | "created_at" | "updated_at" | "messages"> & {
                    messages?: unknown;
                };
                Update: Partial<Pick<Conversation, "messages">>;
                Relationships: [
                    {
                        foreignKeyName: "conversations_tenant_id_fkey";
                        columns: ["tenant_id"];
                        isOneToOne: false;
                        referencedRelation: "profiles";
                        referencedColumns: ["id"];
                    },
                ];
            };
            inquiries: {
                Row: Inquiry;
                Insert: Omit<Inquiry, "id" | "created_at" | "status"> & {
                    status?: InquiryStatus;
                };
                Update: Partial<Pick<Inquiry, "status">>;
                Relationships: [
                    {
                        foreignKeyName: "inquiries_tenant_id_fkey";
                        columns: ["tenant_id"];
                        isOneToOne: false;
                        referencedRelation: "profiles";
                        referencedColumns: ["id"];
                    },
                    {
                        foreignKeyName: "inquiries_apartment_id_fkey";
                        columns: ["apartment_id"];
                        isOneToOne: false;
                        referencedRelation: "apartments";
                        referencedColumns: ["id"];
                    },
                ];
            };
            rental_transactions: {
                Row: RentalTransaction;
                Insert: Omit<RentalTransaction, "id" | "created_at" | "source" | "neighborhood" | "apartment_id" | "lease_end_date"> & {
                    apartment_id?: string | null;
                    neighborhood?: string | null;
                    lease_end_date?: string | null;
                    source?: string;
                };
                Update: Partial<Omit<RentalTransaction, "id" | "created_at">>;
                Relationships: [
                    {
                        foreignKeyName: "rental_transactions_apartment_id_fkey";
                        columns: ["apartment_id"];
                        isOneToOne: false;
                        referencedRelation: "apartments";
                        referencedColumns: ["id"];
                    },
                ];
            };
            inflation_rates: {
                Row: InflationRate;
                Insert: Omit<InflationRate, "id" | "created_at" | "source"> & {
                    source?: string;
                };
                Update: Partial<Omit<InflationRate, "id" | "created_at">>;
                Relationships: [];
            };
            lga_rpi_monthly: {
                Row: LgaRpiMonthly;
                Insert: Omit<
                    LgaRpiMonthly,
                    "id"
                    | "computed_at"
                    | "hist_component"
                    | "comp_component"
                    | "inflation_component"
                    | "sample_size_hist"
                    | "sample_size_comp"
                > & {
                    hist_component?: number | null;
                    comp_component?: number | null;
                    inflation_component?: number;
                    sample_size_hist?: number;
                    sample_size_comp?: number;
                };
                Update: Partial<Omit<LgaRpiMonthly, "id">>;
                Relationships: [];
            };
        };
        Views: Record<string, never>;
        Functions: {
            compute_lga_rpi: {
                Args: {
                    target_year?: number;
                    target_month?: number;
                    filter_city?: string | null;
                    filter_lga?: string | null;
                    filter_apartment_type?: string | null;
                };
                Returns: number;
            };
            get_lga_rpi: {
                Args: {
                    p_city: string;
                    p_lga: string;
                    p_apartment_type?: string | null;
                    p_year?: number | null;
                    p_month?: number | null;
                };
                Returns: {
                    city: string;
                    state_code: string;
                    lga: string;
                    apartment_type: string;
                    year: number;
                    month: number;
                    rpi_value: number;
                    hist_component: number | null;
                    comp_component: number | null;
                    inflation_component: number;
                    sample_size_hist: number;
                    sample_size_comp: number;
                    trend: string;
                    trend_percent: number;
                }[];
            };
        };
        Enums: Record<string, never>;
        CompositeTypes: Record<string, never>;
    };
};
