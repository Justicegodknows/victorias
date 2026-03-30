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

// ---- Database row types ----

export type Profile = {
    id: string;
    full_name: string;
    phone: string | null;
    role: UserRole;
    income_range: string | null;
    preferred_cities: City[];
    created_at: string;
};

export type Apartment = {
    id: string;
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
                Insert: Omit<Profile, "created_at" | "phone" | "income_range" | "preferred_cities"> & {
                    phone?: string | null;
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
        };
        Views: Record<string, never>;
        Functions: Record<string, never>;
        Enums: Record<string, never>;
        CompositeTypes: Record<string, never>;
    };
};
