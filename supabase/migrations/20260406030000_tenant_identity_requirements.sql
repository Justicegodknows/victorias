-- Victoria's Apartment Finder — Tenant identity requirements (NIN/BVN required, Gov ID optional)
-- Migration: 20260406030000_tenant_identity_requirements

-- Add identity fields to profiles.
alter table public.profiles
  add column if not exists nin text,
  add column if not exists bvn text,
  add column if not exists government_id_type text,
  add column if not exists government_id_number text;

-- Restrict acceptable government ID type values.
alter table public.profiles
  drop constraint if exists profiles_government_id_type_check;

alter table public.profiles
  add constraint profiles_government_id_type_check
  check (
    government_id_type is null
    or government_id_type in (
      'national-id-card',
      'drivers-license',
      'international-passport',
      'voters-card'
    )
  );

-- Enforce tenant identity requirements for all NEW/UPDATED tenant rows.
-- Existing rows are not validated immediately to avoid breaking prior data.
alter table public.profiles
  drop constraint if exists profiles_tenant_identity_required;

alter table public.profiles
  add constraint profiles_tenant_identity_required
  check (
    role <> 'tenant'
    or (
      nin ~ '^\d{11}$'
      and bvn ~ '^\d{11}$'
    )
  ) not valid;

-- Ensure identity numbers are not reused across accounts.
create unique index if not exists idx_profiles_nin_unique
  on public.profiles (nin)
  where nin is not null;

create unique index if not exists idx_profiles_bvn_unique
  on public.profiles (bvn)
  where bvn is not null;

-- Update signup trigger to copy identity details from auth metadata.
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (
    id,
    full_name,
    role,
    nin,
    bvn,
    government_id_type,
    government_id_number
  )
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    coalesce(new.raw_user_meta_data->>'role', 'tenant'),
    nullif(trim(coalesce(new.raw_user_meta_data->>'nin', '')), ''),
    nullif(trim(coalesce(new.raw_user_meta_data->>'bvn', '')), ''),
    nullif(trim(coalesce(new.raw_user_meta_data->>'government_id_type', '')), ''),
    nullif(trim(coalesce(new.raw_user_meta_data->>'government_id_number', '')), '')
  );
  return new;
end;
$$ language plpgsql security definer;
