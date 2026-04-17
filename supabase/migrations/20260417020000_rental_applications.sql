-- Victoria's Apartment Finder — Rental Applications
-- Migration: 20260417020000_rental_applications
-- Tenants submit a formal application to rent an apartment; landlords review and respond.

create table public.rental_applications (
  id uuid default gen_random_uuid() primary key,
  tenant_id uuid references public.profiles(id) on delete cascade not null,
  apartment_id uuid references public.apartments(id) on delete cascade not null,
  -- Applicant details
  employment_status text not null check (employment_status in ('employed', 'self-employed', 'student', 'unemployed')),
  employer_name text,
  monthly_income_ngn integer check (monthly_income_ngn >= 0),
  num_occupants integer not null default 1 check (num_occupants >= 1),
  proposed_move_in_date date not null,
  reason_for_moving text,
  notes text,
  -- Lifecycle
  status text not null default 'submitted'
    check (status in ('submitted', 'under_review', 'approved', 'rejected')),
  landlord_note text,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,
  -- One active application per tenant per apartment
  unique (tenant_id, apartment_id)
);

create trigger set_rental_applications_updated_at
  before update on public.rental_applications
  for each row execute function public.update_updated_at();

create index idx_rental_applications_apartment_id on public.rental_applications (apartment_id);
create index idx_rental_applications_tenant_id on public.rental_applications (tenant_id);

alter table public.rental_applications enable row level security;

create policy "Tenants can read own applications"
  on public.rental_applications for select using (auth.uid() = tenant_id);

create policy "Tenants can submit applications"
  on public.rental_applications for insert with check (auth.uid() = tenant_id);

create policy "Landlords can read applications for own apartments"
  on public.rental_applications for select using (
    exists (
      select 1 from public.apartments
      where apartments.id = rental_applications.apartment_id
        and apartments.landlord_id = auth.uid()
    )
  );

create policy "Landlords can update application status"
  on public.rental_applications for update using (
    exists (
      select 1 from public.apartments
      where apartments.id = rental_applications.apartment_id
        and apartments.landlord_id = auth.uid()
    )
  ) with check (status in ('under_review', 'approved', 'rejected'));
