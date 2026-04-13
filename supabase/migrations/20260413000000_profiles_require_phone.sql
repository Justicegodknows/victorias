-- Victoria's Apartment Finder — Require phone numbers for all new profile registrations
-- Migration: 20260413000000_profiles_require_phone

alter table public.profiles
  drop constraint if exists profiles_phone_required;

alter table public.profiles
  add constraint profiles_phone_required
  check (nullif(trim(phone), '') is not null) not valid;

alter table public.profiles
  drop constraint if exists profiles_phone_e164_format;

alter table public.profiles
  add constraint profiles_phone_e164_format
  check (phone ~ '^\+[1-9][0-9]{9,14}$') not valid;

-- Ensure signup trigger persists phone into profiles for both tenant and landlord users.
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
