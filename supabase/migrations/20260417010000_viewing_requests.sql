-- Victoria's Apartment Finder — Viewing Requests
-- Migration: 20260417010000_viewing_requests
-- Tenants can request to view an apartment; landlords respond by confirming or declining.

create table public.viewing_requests (
  id uuid default gen_random_uuid() primary key,
  tenant_id uuid references public.profiles(id) on delete cascade not null,
  apartment_id uuid references public.apartments(id) on delete cascade not null,
  preferred_date date not null,
  preferred_time text not null check (preferred_time in ('morning', 'afternoon', 'evening')),
  message text,
  status text not null default 'pending' check (status in ('pending', 'confirmed', 'declined', 'cancelled')),
  landlord_note text,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,
  -- A tenant can only have one active (pending/confirmed) request per apartment at a time
  unique (tenant_id, apartment_id, status)
);

create trigger set_viewing_requests_updated_at
  before update on public.viewing_requests
  for each row execute function public.update_updated_at();

create index idx_viewing_requests_apartment_id on public.viewing_requests (apartment_id);
create index idx_viewing_requests_tenant_id on public.viewing_requests (tenant_id);

alter table public.viewing_requests enable row level security;

-- Tenants can read their own requests
create policy "Tenants can read own viewing requests"
  on public.viewing_requests for select using (auth.uid() = tenant_id);

-- Tenants can create requests
create policy "Tenants can create viewing requests"
  on public.viewing_requests for insert with check (auth.uid() = tenant_id);

-- Tenants can cancel their own pending requests
create policy "Tenants can cancel own viewing requests"
  on public.viewing_requests for update using (
    auth.uid() = tenant_id and status = 'pending'
  ) with check (status = 'cancelled');

-- Landlords can read requests for their apartments
create policy "Landlords can read viewing requests for own apartments"
  on public.viewing_requests for select using (
    exists (
      select 1 from public.apartments
      where apartments.id = viewing_requests.apartment_id
        and apartments.landlord_id = auth.uid()
    )
  );

-- Landlords can confirm or decline requests for their apartments
create policy "Landlords can respond to viewing requests"
  on public.viewing_requests for update using (
    exists (
      select 1 from public.apartments
      where apartments.id = viewing_requests.apartment_id
        and apartments.landlord_id = auth.uid()
    )
  ) with check (status in ('confirmed', 'declined'));
