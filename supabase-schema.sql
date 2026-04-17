-- Victoria's Apartment Finder — Supabase Schema
-- Run this in the Supabase SQL Editor

-- ============================================================
-- 0. Agents (real estate agents who manage landlords)
-- ============================================================
create table public.agents (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  phone text not null check (phone ~ '^\+[1-9][0-9]{9,14}$'),
  email text,
  license_number text,
  office_address text,
  city text check (city in ('lagos', 'abuja', 'port-harcourt')),
  is_verified boolean default false not null,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

alter table public.agents enable row level security;

create policy "Authenticated users can read agents"
  on public.agents for select to authenticated using (true);

-- ============================================================
-- 1. Profiles (extends auth.users)
-- ============================================================
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  full_name text not null,
  phone text not null check (phone ~ '^\\+[1-9][0-9]{9,14}$'),
  role text not null check (role in ('landlord', 'tenant')),
  nin text,
  bvn text,
  government_id_type text check (government_id_type in (
    'national-id-card', 'drivers-license', 'international-passport', 'voters-card'
  )),
  government_id_number text,
  income_range text,
  preferred_cities text[] default '{}',
  agent_id uuid references public.agents(id) on delete set null,
  created_at timestamptz default now() not null,
  constraint profiles_agent_id_landlord_only check (agent_id is null or role = 'landlord'),
  constraint profiles_tenant_identity_required check (
    role <> 'tenant'
    or (
      nin ~ '^\\d{11}$'
      and bvn ~ '^\\d{11}$'
    )
  )
);

create unique index idx_profiles_nin_unique
  on public.profiles (nin)
  where nin is not null;

create unique index idx_profiles_bvn_unique
  on public.profiles (bvn)
  where bvn is not null;

alter table public.profiles enable row level security;

create policy "Users can read own profile"
  on public.profiles for select using (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update using (auth.uid() = id);

create policy "Users can insert own profile"
  on public.profiles for insert with check (auth.uid() = id);

-- Auto-create profile on signup via trigger
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (
    id,
    full_name,
    phone,
    role,
    nin,
    bvn,
    government_id_type,
    government_id_number
  )
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    nullif(trim(coalesce(new.raw_user_meta_data->>'phone', new.phone, '')), ''),
    coalesce(new.raw_user_meta_data->>'role', 'tenant'),
    nullif(trim(coalesce(new.raw_user_meta_data->>'nin', '')), ''),
    nullif(trim(coalesce(new.raw_user_meta_data->>'bvn', '')), ''),
    nullif(trim(coalesce(new.raw_user_meta_data->>'government_id_type', '')), ''),
    nullif(trim(coalesce(new.raw_user_meta_data->>'government_id_number', '')), '')
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================
-- 2. Apartments
-- ============================================================
create table public.apartments (
  id uuid default gen_random_uuid() primary key,
  ppid text unique not null,
  landlord_id uuid references public.profiles(id) on delete cascade not null,
  title text not null,
  description text not null default '',
  apartment_type text not null check (apartment_type in (
    'self-contained', 'mini-flat', '1-bedroom', '2-bedroom', '3-bedroom', 'duplex'
  )),
  annual_rent integer not null check (annual_rent > 0),
  deposit integer not null default 0,
  agent_fee integer not null default 0,
  total_upfront_cost integer generated always as (annual_rent + deposit + agent_fee) stored,
  address text not null default '',
  city text not null check (city in ('lagos', 'abuja', 'port-harcourt')),
  lga text not null default '',
  neighborhood text not null default '',
  latitude double precision,
  longitude double precision,
  is_verified boolean default false,
  is_available boolean default true,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

alter table public.apartments enable row level security;

-- Anyone can read available apartments
create policy "Anyone can read available apartments"
  on public.apartments for select using (is_available = true);

-- Landlords can read all their own apartments (including unavailable)
create policy "Landlords can read own apartments"
  on public.apartments for select using (auth.uid() = landlord_id);

create policy "Landlords can insert own apartments"
  on public.apartments for insert with check (auth.uid() = landlord_id);

create policy "Landlords can update own apartments"
  on public.apartments for update using (auth.uid() = landlord_id);

create policy "Landlords can delete own apartments"
  on public.apartments for delete using (auth.uid() = landlord_id);

-- Updated_at trigger
create or replace function public.update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger set_apartments_updated_at
  before update on public.apartments
  for each row execute function public.update_updated_at();

create trigger set_agents_updated_at
  before update on public.agents
  for each row execute function public.update_updated_at();

create or replace function public.generate_apartment_ppid(
  apartment_id uuid,
  city_value text,
  lga_value text
)
returns text
language plpgsql
immutable
as $$
declare
  state_code text;
  lga_code text;
  unique_suffix text;
begin
  state_code := case city_value
    when 'lagos' then 'LA'
    when 'abuja' then 'FC'
    when 'port-harcourt' then 'RI'
    else coalesce(nullif(left(regexp_replace(upper(coalesce(city_value, '')), '[^A-Z0-9]+', '', 'g'), 2), ''), 'ST')
  end;

  lga_code := coalesce(
    nullif(left(regexp_replace(upper(coalesce(lga_value, '')), '[^A-Z0-9]+', '', 'g'), 3), ''),
    'LGA'
  );

  unique_suffix := right(replace(apartment_id::text, '-', ''), 8);

  return format('PPID-%s-%s-%s', state_code, lga_code, unique_suffix);
end;
$$;

create or replace function public.set_apartment_ppid()
returns trigger
language plpgsql
as $$
begin
  if new.id is null then
    new.id := gen_random_uuid();
  end if;

  if tg_op = 'INSERT'
     or new.city is distinct from old.city
     or new.lga is distinct from old.lga
     or new.ppid is null then
    new.ppid := public.generate_apartment_ppid(new.id, new.city, new.lga);
  end if;

  return new;
end;
$$;

create trigger set_apartments_ppid
  before insert or update of city, lga on public.apartments
  for each row execute function public.set_apartment_ppid();

-- ============================================================
-- 3. Apartment amenities
-- ============================================================
create table public.apartment_amenities (
  id uuid default gen_random_uuid() primary key,
  apartment_id uuid references public.apartments(id) on delete cascade not null,
  amenity text not null check (amenity in (
    'water_supply', 'generator', 'security', 'parking', 'prepaid_meter',
    'pop_ceiling', 'tiled_floor', 'wardrobe', 'kitchen_cabinet',
    'balcony', 'fenced_compound', 'gate_man'
  )),
  unique (apartment_id, amenity)
);

alter table public.apartment_amenities enable row level security;

create policy "Anyone can read amenities"
  on public.apartment_amenities for select using (true);

create policy "Landlords can manage amenities"
  on public.apartment_amenities for insert with check (
    exists (select 1 from public.apartments where id = apartment_id and landlord_id = auth.uid())
  );

create policy "Landlords can delete amenities"
  on public.apartment_amenities for delete using (
    exists (select 1 from public.apartments where id = apartment_id and landlord_id = auth.uid())
  );

-- ============================================================
-- 4. Apartment images
-- ============================================================
create table public.apartment_images (
  id uuid default gen_random_uuid() primary key,
  apartment_id uuid references public.apartments(id) on delete cascade not null,
  image_url text not null,
  is_primary boolean default false,
  display_order integer default 0
);

alter table public.apartment_images enable row level security;

create policy "Anyone can read images"
  on public.apartment_images for select using (true);

create policy "Landlords can manage images"
  on public.apartment_images for insert with check (
    exists (select 1 from public.apartments where id = apartment_id and landlord_id = auth.uid())
  );

create policy "Landlords can update images"
  on public.apartment_images for update using (
    exists (select 1 from public.apartments where id = apartment_id and landlord_id = auth.uid())
  );

create policy "Landlords can delete images"
  on public.apartment_images for delete using (
    exists (select 1 from public.apartments where id = apartment_id and landlord_id = auth.uid())
  );

-- ============================================================
-- 5. Environmental factors
-- ============================================================
create table public.environmental_factors (
  id uuid default gen_random_uuid() primary key,
  apartment_id uuid references public.apartments(id) on delete cascade not null unique,
  flood_risk text not null default 'low' check (flood_risk in ('low', 'medium', 'high')),
  power_supply_rating integer not null default 3 check (power_supply_rating between 1 and 5),
  water_supply_rating integer not null default 3 check (water_supply_rating between 1 and 5),
  security_rating integer not null default 3 check (security_rating between 1 and 5),
  road_condition_rating integer not null default 3 check (road_condition_rating between 1 and 5),
  nearest_bus_stop text,
  nearest_market text,
  nearest_hospital text,
  traffic_notes text
);

alter table public.environmental_factors enable row level security;

create policy "Anyone can read environmental factors"
  on public.environmental_factors for select using (true);

create policy "Landlords can manage environmental factors"
  on public.environmental_factors for insert with check (
    exists (select 1 from public.apartments where id = apartment_id and landlord_id = auth.uid())
  );

create policy "Landlords can update environmental factors"
  on public.environmental_factors for update using (
    exists (select 1 from public.apartments where id = apartment_id and landlord_id = auth.uid())
  );

-- ============================================================
-- 6. Saved apartments
-- ============================================================
create table public.saved_apartments (
  id uuid default gen_random_uuid() primary key,
  tenant_id uuid references public.profiles(id) on delete cascade not null,
  apartment_id uuid references public.apartments(id) on delete cascade not null,
  created_at timestamptz default now() not null,
  unique (tenant_id, apartment_id)
);

alter table public.saved_apartments enable row level security;

create policy "Tenants can read own saved"
  on public.saved_apartments for select using (auth.uid() = tenant_id);

create policy "Tenants can save apartments"
  on public.saved_apartments for insert with check (auth.uid() = tenant_id);

create policy "Tenants can unsave apartments"
  on public.saved_apartments for delete using (auth.uid() = tenant_id);

-- ============================================================
-- 7. Conversations (AI chat history)
-- ============================================================
create table public.conversations (
  id uuid default gen_random_uuid() primary key,
  tenant_id uuid references public.profiles(id) on delete cascade not null,
  messages jsonb not null default '[]',
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

alter table public.conversations enable row level security;

create policy "Tenants can read own conversations"
  on public.conversations for select using (auth.uid() = tenant_id);

create policy "Tenants can create conversations"
  on public.conversations for insert with check (auth.uid() = tenant_id);

create policy "Tenants can update own conversations"
  on public.conversations for update using (auth.uid() = tenant_id);

create trigger set_conversations_updated_at
  before update on public.conversations
  for each row execute function public.update_updated_at();

-- ============================================================
-- 8. Inquiries
-- ============================================================
create table public.inquiries (
  id uuid default gen_random_uuid() primary key,
  tenant_id uuid references public.profiles(id) on delete cascade not null,
  apartment_id uuid references public.apartments(id) on delete cascade not null,
  message text not null,
  status text not null default 'pending' check (status in ('pending', 'responded', 'closed')),
  created_at timestamptz default now() not null
);

alter table public.inquiries enable row level security;

create policy "Tenants can read own inquiries"
  on public.inquiries for select using (auth.uid() = tenant_id);

create policy "Tenants can create inquiries"
  on public.inquiries for insert with check (auth.uid() = tenant_id);

-- Landlords can read inquiries on their apartments
create policy "Landlords can read inquiries for own apartments"
  on public.inquiries for select using (
    exists (select 1 from public.apartments where id = apartment_id and landlord_id = auth.uid())
  );

-- Landlords can update inquiry status
create policy "Landlords can update inquiry status"
  on public.inquiries for update using (
    exists (select 1 from public.apartments where id = apartment_id and landlord_id = auth.uid())
  );

-- ============================================================
-- 9. Indexes for common queries
-- ============================================================
create index idx_apartments_city on public.apartments(city);
create index idx_apartments_type on public.apartments(apartment_type);
create index idx_apartments_rent on public.apartments(annual_rent);
create index idx_apartments_available on public.apartments(is_available);
create index idx_apartments_landlord on public.apartments(landlord_id);
create index idx_apartments_neighborhood on public.apartments(city, neighborhood);
create index idx_inquiries_apartment on public.inquiries(apartment_id);
create index idx_inquiries_tenant on public.inquiries(tenant_id);
create index idx_saved_tenant on public.saved_apartments(tenant_id);

-- ============================================================
-- 10. Storage bucket for apartment images
-- ============================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'apartment-images',
  'apartment-images',
  true,
  5242880, -- 5MB
  array['image/jpeg', 'image/png', 'image/webp']
);

-- Storage policies
create policy "Anyone can view apartment images"
  on storage.objects for select using (bucket_id = 'apartment-images');

create policy "Authenticated users can upload apartment images"
  on storage.objects for insert with check (
    bucket_id = 'apartment-images' and auth.role() = 'authenticated'
  );

create policy "Users can delete own apartment images"
  on storage.objects for delete using (
    bucket_id = 'apartment-images' and auth.uid()::text = (storage.foldername(name))[1]
  );

-- ============================================================
-- 11. Rental Price Index (RPI)
-- ============================================================
create table public.rental_transactions (
  id uuid default gen_random_uuid() primary key,
  apartment_id uuid references public.apartments(id) on delete set null,
  city text not null check (city in ('lagos', 'abuja', 'port-harcourt')),
  lga text not null,
  neighborhood text,
  apartment_type text not null check (apartment_type in (
    'self-contained', 'mini-flat', '1-bedroom', '2-bedroom', '3-bedroom', 'duplex'
  )),
  annual_rent integer not null check (annual_rent > 0),
  lease_start_date date not null,
  lease_end_date date,
  source text not null default 'manual',
  created_at timestamptz default now() not null
);

create table public.inflation_rates (
  id uuid default gen_random_uuid() primary key,
  state_code text not null check (state_code in ('LA', 'FC', 'RI')),
  year integer not null check (year >= 2000),
  month integer not null check (month between 1 and 12),
  monthly_rate numeric(8, 6) not null check (monthly_rate > -1),
  source text not null default 'official',
  created_at timestamptz default now() not null,
  unique (state_code, year, month)
);

create table public.lga_rpi_monthly (
  id uuid default gen_random_uuid() primary key,
  city text not null check (city in ('lagos', 'abuja', 'port-harcourt')),
  state_code text not null check (state_code in ('LA', 'FC', 'RI')),
  lga text not null,
  apartment_type text not null check (apartment_type in (
    'all', 'self-contained', 'mini-flat', '1-bedroom', '2-bedroom', '3-bedroom', 'duplex'
  )),
  year integer not null check (year >= 2000),
  month integer not null check (month between 1 and 12),
  rpi_value numeric(12, 2) not null check (rpi_value > 0),
  hist_component numeric(12, 2),
  comp_component numeric(12, 2),
  inflation_component numeric(8, 6) not null default 0,
  sample_size_hist integer not null default 0,
  sample_size_comp integer not null default 0,
  computed_at timestamptz not null default now(),
  unique (city, lga, apartment_type, year, month)
);

create index idx_rental_transactions_scope
  on public.rental_transactions(city, lga, apartment_type, lease_start_date desc);
create index idx_rental_transactions_apartment
  on public.rental_transactions(apartment_id);
create index idx_inflation_rates_period
  on public.inflation_rates(state_code, year, month);
create index idx_lga_rpi_lookup
  on public.lga_rpi_monthly(city, lga, apartment_type, year, month desc);

alter table public.rental_transactions enable row level security;
alter table public.inflation_rates enable row level security;
alter table public.lga_rpi_monthly enable row level security;

create policy "Anyone can read rental transactions"
  on public.rental_transactions for select using (true);
create policy "Anyone can read inflation rates"
  on public.inflation_rates for select using (true);
create policy "Anyone can read LGA RPI"
  on public.lga_rpi_monthly for select using (true);

create policy "Service role can manage rental transactions"
  on public.rental_transactions for insert with check (auth.role() = 'service_role');
create policy "Service role can update rental transactions"
  on public.rental_transactions for update using (auth.role() = 'service_role');
create policy "Service role can delete rental transactions"
  on public.rental_transactions for delete using (auth.role() = 'service_role');

create policy "Service role can manage inflation rates"
  on public.inflation_rates for insert with check (auth.role() = 'service_role');
create policy "Service role can update inflation rates"
  on public.inflation_rates for update using (auth.role() = 'service_role');
create policy "Service role can delete inflation rates"
  on public.inflation_rates for delete using (auth.role() = 'service_role');

create policy "Service role can manage LGA RPI"
  on public.lga_rpi_monthly for insert with check (auth.role() = 'service_role');
create policy "Service role can update LGA RPI"
  on public.lga_rpi_monthly for update using (auth.role() = 'service_role');
create policy "Service role can delete LGA RPI"
  on public.lga_rpi_monthly for delete using (auth.role() = 'service_role');

create or replace function public.city_to_state_code(city_value text)
returns text
language sql
immutable
as $$
  select case city_value
    when 'lagos' then 'LA'
    when 'abuja' then 'FC'
    when 'port-harcourt' then 'RI'
    else 'LA'
  end;
$$;

-- See migration 20260406010000_rpi_index.sql for full implementation details.
-- RPI function definitions:
-- - public.compute_lga_rpi(...)
-- - public.get_lga_rpi(...)
-- are maintained in migration 20260406010000_rpi_index.sql.
