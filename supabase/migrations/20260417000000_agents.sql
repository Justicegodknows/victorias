-- Victoria's Apartment Finder — Real Estate Agents
-- Migration: 20260417000000_agents
-- An agent can manage many landlords; each landlord belongs to at most one agent.

-- ============================================================
-- 1. Agents table
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

create trigger set_agents_updated_at
  before update on public.agents
  for each row execute function public.update_updated_at();

alter table public.agents enable row level security;

-- Anyone authenticated can read agent profiles
create policy "Authenticated users can read agents"
  on public.agents for select to authenticated using (true);

-- ============================================================
-- 2. Link landlords to agents (many landlords → one agent)
-- ============================================================
alter table public.profiles
  add column agent_id uuid references public.agents(id) on delete set null;

-- Enforce that only landlord profiles can be assigned to an agent
alter table public.profiles
  add constraint profiles_agent_id_landlord_only
  check (agent_id is null or role = 'landlord');

create index idx_profiles_agent_id on public.profiles (agent_id)
  where agent_id is not null;
