-- Victoria's Apartment Finder — Agent Authentication & Codes
-- Migration: 20260417030000_agents_auth
-- Links agents to Supabase auth, gives each agent a shareable code,
-- and allows landlords to link to an agent during registration.

-- ============================================================
-- 1. Extend agents table with auth link + unique agent_code
-- ============================================================
alter table public.agents
  add column if not exists user_id uuid unique references auth.users(id) on delete cascade,
  add column if not exists agent_code text unique;

-- Generate agent codes for any existing agents that don't have one
update public.agents
set agent_code = 'AGT-' || upper(substring(replace(gen_random_uuid()::text, '-', ''), 1, 8))
where agent_code is null;

-- Make agent_code not null going forward
alter table public.agents
  alter column agent_code set not null;

create index if not exists idx_agents_agent_code on public.agents (agent_code);
create index if not exists idx_agents_user_id on public.agents (user_id);

-- ============================================================
-- 2. Allow 'agent' as a profile role
-- ============================================================
alter table public.profiles
  drop constraint if exists profiles_role_check;

alter table public.profiles
  add constraint profiles_role_check
  check (role in ('landlord', 'tenant', 'agent'));

-- Update agent_id constraint: only landlords and agents (never agents linking to agents)
alter table public.profiles
  drop constraint if exists profiles_agent_id_landlord_only;

alter table public.profiles
  add constraint profiles_agent_id_landlord_only
  check (agent_id is null or role = 'landlord');

-- ============================================================
-- 3. RLS — agents can read their own landlords
-- ============================================================
create policy "Agents can read own profile"
  on public.agents for select to authenticated
  using (user_id = auth.uid());

create policy "Agents can update own profile"
  on public.agents for update to authenticated
  using (user_id = auth.uid());

-- Agents can read profiles of landlords assigned to them
create policy "Agents can read own landlord profiles"
  on public.profiles for select
  using (
    agent_id in (
      select id from public.agents where user_id = auth.uid()
    )
  );

-- ============================================================
-- 4. Update handle_new_user() trigger to handle agent role
--    and link landlords to their agent via agent_code
-- ============================================================
create or replace function public.handle_new_user()
returns trigger as $$
declare
  v_role        text;
  v_agent_id    uuid;
  v_agent_code_input text;
  v_new_code    text;
begin
  v_role := coalesce(new.raw_user_meta_data->>'role', 'tenant');

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
    v_role,
    nullif(trim(coalesce(new.raw_user_meta_data->>'nin', '')), ''),
    nullif(trim(coalesce(new.raw_user_meta_data->>'bvn', '')), ''),
    nullif(trim(coalesce(new.raw_user_meta_data->>'government_id_type', '')), ''),
    nullif(trim(coalesce(new.raw_user_meta_data->>'government_id_number', '')), '')
  );

  -- For agents: create an agents row with a generated code
  if v_role = 'agent' then
    v_new_code := 'AGT-' || upper(substring(replace(gen_random_uuid()::text, '-', ''), 1, 8));
    insert into public.agents (
      user_id,
      name,
      phone,
      agent_code
    )
    values (
      new.id,
      coalesce(new.raw_user_meta_data->>'full_name', ''),
      nullif(trim(coalesce(new.raw_user_meta_data->>'phone', new.phone, '')), ''),
      v_new_code
    );
  end if;

  -- For landlords: link to agent via agent_code supplied at registration
  if v_role = 'landlord' then
    v_agent_code_input := nullif(trim(coalesce(new.raw_user_meta_data->>'agent_code', '')), '');
    if v_agent_code_input is not null then
      select id into v_agent_id
        from public.agents
       where agent_code = v_agent_code_input;

      if v_agent_id is not null then
        update public.profiles
           set agent_id = v_agent_id
         where id = new.id;
      end if;
    end if;
  end if;

  return new;
end;
$$ language plpgsql security definer;
