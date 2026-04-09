-- Seed 3 landlords + 10 dummy apartment listings for local/dev testing.
-- Fully self-contained: creates auth users, profiles, apartments, amenities,
-- images, and environmental factors.
-- Safe to run multiple times: existing rows with the same email/title are skipped.
--
-- Usage (via Docker compose):
--   docker compose --profile seed run --rm seed
-- Or directly:
--   psql "$SUPABASE_DB_URL" -f supabase/test-data/seed_dummy_listings.sql

begin;

-- ============================================================
-- 1. Create 3 landlord auth users (skipped if they already exist)
-- ============================================================
-- We use deterministic UUIDs so the script is idempotent.
do $$
declare
  landlord_ids uuid[] := array[
    'a0000000-0000-4000-8000-000000000001'::uuid,
    'a0000000-0000-4000-8000-000000000002'::uuid,
    'a0000000-0000-4000-8000-000000000003'::uuid
  ];
  landlord_emails text[] := array[
    'landlord.ade@victorias.test',
    'landlord.bola@victorias.test',
    'landlord.chidi@victorias.test'
  ];
  landlord_names text[] := array[
    'Ade Okonkwo',
    'Bola Adeyemi',
    'Chidi Nnamdi'
  ];
  landlord_phones text[] := array[
    '+2348012345001',
    '+2348012345002',
    '+2348012345003'
  ];
  i integer;
begin
  for i in 1..3 loop
    -- Skip if auth user already exists
    if not exists (select 1 from auth.users where id = landlord_ids[i]) then
      insert into auth.users (
        id,
        instance_id,
        aud,
        role,
        email,
        encrypted_password,
        email_confirmed_at,
        raw_app_meta_data,
        raw_user_meta_data,
        created_at,
        updated_at,
        confirmation_token,
        email_change,
        email_change_token_new,
        recovery_token
      ) values (
        landlord_ids[i],
        '00000000-0000-0000-0000-000000000000',
        'authenticated',
        'authenticated',
        landlord_emails[i],
        -- bcrypt hash of 'password123' (cost=10)
        '$2a$10$PznUGOaOUTii/GRK0QuJVO/XJjNm3JWgHAzSE78wkh.GdU2y3aIa',
        now(),
        '{"provider":"email","providers":["email"]}',
        jsonb_build_object(
          'full_name', landlord_names[i],
          'role', 'landlord'
        ),
        now(),
        now(),
        '',
        '',
        '',
        ''
      );
    end if;

    -- Ensure profile exists (the trigger may have created it, but guard against reruns)
    insert into public.profiles (id, full_name, phone, role)
    values (landlord_ids[i], landlord_names[i], landlord_phones[i], 'landlord')
    on conflict (id) do update set
      full_name = excluded.full_name,
      phone = excluded.phone;
  end loop;
end $$;

-- ============================================================
-- 2. Stage the 10 listings
-- ============================================================
create temporary table tmp_listing_seed (
  seed_idx integer primary key,
  title text not null,
  description text not null,
  apartment_type text not null,
  annual_rent integer not null,
  deposit integer not null,
  agent_fee integer not null,
  address text not null,
  city text not null,
  lga text not null,
  neighborhood text not null,
  latitude double precision,
  longitude double precision
) on commit drop;

insert into tmp_listing_seed (
  seed_idx, title, description, apartment_type,
  annual_rent, deposit, agent_fee,
  address, city, lga, neighborhood,
  latitude, longitude
) values
  (1,
   'Lekki 2BR in gated estate',
   'Modern 2-bedroom apartment in Lekki Phase 1 with strong estate security, 24-hour water supply, and fitted kitchen cabinets. Located along Admiralty Way within walking distance of major banks and restaurants.',
   '2-bedroom', 2800000, 280000, 280000,
   '12 Admiralty Way, Lekki Phase 1', 'lagos', 'Eti-Osa', 'Lekki Phase 1',
   6.4470, 3.4720),

  (2,
   'Yaba mini-flat near tech hub',
   'Compact mini-flat ideally positioned for tech professionals. Walking distance to Yaba tech ecosystem hubs, UNILAG campus, and multiple BRT bus routes. Freshly painted with tiled flooring throughout.',
   'mini-flat', 950000, 95000, 95000,
   '17 Herbert Macaulay Way, Yaba', 'lagos', 'Lagos Mainland', 'Yaba',
   6.5095, 3.3792),

  (3,
   'Ikeja 1BR close to Allen Avenue',
   'Well-finished 1-bedroom off Opebi Road in Ikeja with prepaid meter and fenced compound. Short drive to Ikeja City Mall, MMA domestic airport, and Allen Avenue commercial strip.',
   '1-bedroom', 1400000, 140000, 140000,
   '22 Opebi Road, Ikeja', 'lagos', 'Ikeja', 'Ikeja',
   6.6018, 3.3515),

  (4,
   'Surulere self-contained starter home',
   'Affordable self-contained unit on Bode Thomas Street in Surulere. Perfect for young professionals — close to National Stadium, Adeniran Ogunsanya Shopping Mall, and major bus corridors.',
   'self-contained', 480000, 50000, 50000,
   '8 Bode Thomas Street, Surulere', 'lagos', 'Surulere', 'Surulere',
   6.5001, 3.3539),

  (5,
   'Wuse 2 serviced 2BR apartment',
   'Serviced 2-bedroom in Wuse 2 with 24-hour power from dedicated transformer, borehole water, and CCTV-monitored compound. Minutes from Banex Plaza and Jabi Lake Mall.',
   '2-bedroom', 3600000, 360000, 360000,
   '14 Aminu Kano Crescent, Wuse 2', 'abuja', 'Abuja Municipal', 'Wuse 2',
   9.0819, 7.4727),

  (6,
   'Gwarinpa 3BR family apartment',
   'Spacious 3-bedroom flat in Gwarinpa estate with dedicated parking, gate man, and children-friendly compound. Close to schools and Gwarinpa market for daily supplies.',
   '3-bedroom', 2400000, 240000, 240000,
   '3 69 Road, Gwarinpa', 'abuja', 'Abuja Municipal', 'Gwarinpa',
   9.1193, 7.3986),

  (7,
   'Kubwa budget mini-flat',
   'Budget-friendly mini-flat on Arab Road in Kubwa. Great for civil servant commuters — 25-minute drive to the CBD. Close to Kubwa FHA market and FO1 bus stop.',
   'mini-flat', 650000, 65000, 65000,
   '5 Arab Road, Kubwa', 'abuja', 'Bwari', 'Kubwa',
   9.1549, 7.3226),

  (8,
   'Maitama premium duplex',
   'Premium 4-unit duplex on Aguiyi Ironsi Street in Maitama with top-tier finishing, smart-home pre-wiring, embassy-grade security, ensuite rooms, and a private garden. Diplomatic enclave.',
   'duplex', 12500000, 1250000, 1250000,
   '4 Aguiyi Ironsi Street, Maitama', 'abuja', 'Abuja Municipal', 'Maitama',
   9.0904, 7.5028),

  (9,
   'PH GRA Phase 2 cozy 1BR',
   'Comfortable 1-bedroom in GRA Phase 2, Port Harcourt. Reliable borehole water, estate security, and tarred internal roads. Minutes from Pleasure Park and Azikiwe Road commercial area.',
   '1-bedroom', 1200000, 120000, 120000,
   '9 Tombia Street, GRA Phase 2', 'port-harcourt', 'Obio-Akpor', 'GRA Phase 2',
   4.8156, 7.0335),

  (10,
   'Rumuola 2BR with prepaid meter',
   '2-bedroom flat on Aba Road in Rumuola with fenced compound, prepaid meter, and good road accessibility. Near Rumuola junction and Oil Mill Market for essentials.',
   '2-bedroom', 1500000, 150000, 150000,
   '11 Aba Road, Rumuola', 'port-harcourt', 'Obio-Akpor', 'Rumuola',
   4.8462, 7.0189);

-- ============================================================
-- 3. Insert apartments (skip duplicates by title)
-- ============================================================
create temporary table tmp_inserted_dummy (
  apartment_id uuid not null,
  seed_idx integer not null,
  title text not null
) on commit drop;

-- Landlord assignment: round-robin across the 3 deterministic IDs
create temporary table tmp_owner_pool (
  id uuid not null,
  rn integer not null
) on commit drop;

insert into tmp_owner_pool (id, rn) values
  ('a0000000-0000-4000-8000-000000000001'::uuid, 1),
  ('a0000000-0000-4000-8000-000000000002'::uuid, 2),
  ('a0000000-0000-4000-8000-000000000003'::uuid, 3);

-- Listings 1-4: Ade (Lagos), 5-7: Bola (Abuja budget/mid), 8: Bola (Abuja premium),
-- 9-10: Chidi (Port Harcourt)
-- Using modular assignment: ((seed_idx-1) % 3) + 1

with
inserted_apartments as (
  insert into public.apartments (
    landlord_id, title, description, apartment_type,
    annual_rent, deposit, agent_fee,
    address, city, lga, neighborhood,
    latitude, longitude,
    is_verified, is_available
  )
  select
    (select o.id from tmp_owner_pool o
     where o.rn = ((s.seed_idx - 1) % 3) + 1
    ) as landlord_id,
    s.title, s.description, s.apartment_type,
    s.annual_rent, s.deposit, s.agent_fee,
    s.address, s.city, s.lga, s.neighborhood,
    s.latitude, s.longitude,
    true, true
  from tmp_listing_seed s
  where not exists (
    select 1 from public.apartments a where a.title = s.title
  )
  returning id, title
)
insert into tmp_inserted_dummy (apartment_id, seed_idx, title)
select a.id, s.seed_idx, a.title
from inserted_apartments a
join tmp_listing_seed s on s.title = a.title;

-- ============================================================
-- 4. Environmental factors
-- ============================================================
insert into public.environmental_factors (
  apartment_id,
  flood_risk, power_supply_rating, water_supply_rating,
  security_rating, road_condition_rating,
  nearest_bus_stop, nearest_market, nearest_hospital, traffic_notes
)
select
  i.apartment_id,
  -- flood_risk
  case
    when i.seed_idx in (1)       then 'medium'
    when i.seed_idx in (2, 4)    then 'medium'
    when i.seed_idx = 9          then 'high'
    else 'low'
  end,
  -- power_supply_rating
  case
    when i.seed_idx in (5, 8)       then 5
    when i.seed_idx in (1, 3, 6, 9) then 4
    when i.seed_idx = 10             then 3
    else 3
  end,
  -- water_supply_rating
  case
    when i.seed_idx in (1, 5, 8, 9) then 4
    when i.seed_idx in (6)           then 4
    else 3
  end,
  -- security_rating
  case
    when i.seed_idx in (5, 8)          then 5
    when i.seed_idx in (1, 3, 6, 9)   then 4
    else 3
  end,
  -- road_condition_rating
  case
    when i.seed_idx in (5, 8)          then 5
    when i.seed_idx in (1, 3, 6, 9)   then 4
    else 3
  end,
  -- nearest_bus_stop
  case
    when i.seed_idx = 1  then 'Lekki Phase 1 Bus Stop'
    when i.seed_idx = 2  then 'Sabo Bus Stop'
    when i.seed_idx = 3  then 'Allen Junction'
    when i.seed_idx = 4  then 'Ojuelegba Bus Stop'
    when i.seed_idx = 5  then 'Banex Junction'
    when i.seed_idx = 6  then 'Gwarinpa 1st Avenue Gate'
    when i.seed_idx = 7  then 'Kubwa FO1'
    when i.seed_idx = 8  then 'Maitama Roundabout'
    when i.seed_idx = 9  then 'GRA Junction'
    else 'Rumuola Junction'
  end,
  -- nearest_market
  case
    when i.seed_idx = 1  then 'Lekki Market Phase 1'
    when i.seed_idx = 2  then 'Tejuosho Market'
    when i.seed_idx = 3  then 'Ikeja Computer Village'
    when i.seed_idx = 4  then 'Adeniran Ogunsanya Market'
    when i.seed_idx in (5, 8) then 'Wuse Market'
    when i.seed_idx = 6  then 'Gwarinpa Market'
    when i.seed_idx = 7  then 'Kubwa Village Market'
    when i.seed_idx = 9  then 'Mile 1 Market'
    else 'Oil Mill Market'
  end,
  -- nearest_hospital
  case
    when i.seed_idx in (1, 2, 3, 4) then 'Lagos University Teaching Hospital (LUTH)'
    when i.seed_idx in (5, 6, 7, 8) then 'National Hospital Abuja'
    else 'University of Port Harcourt Teaching Hospital'
  end,
  -- traffic_notes
  case
    when i.seed_idx = 1  then 'Lekki-Epe Expressway peak-hour congestion; tollgate queues common.'
    when i.seed_idx = 2  then 'Herbert Macaulay artery gets heavy during rush hours.'
    when i.seed_idx = 3  then 'Moderate traffic around Ikeja bus terminal; avoid Allen roundabout at 5 PM.'
    when i.seed_idx = 4  then 'Funsho Williams Avenue rush-hour bottleneck nearby.'
    when i.seed_idx = 5  then 'Generally smooth roads; minor Banex Plaza congestion on weekends.'
    when i.seed_idx = 6  then 'Gwarinpa expressway exit slows down 7-9 AM and 5-7 PM.'
    when i.seed_idx = 7  then 'Kubwa-CBD commute: ~25 min off-peak, 50+ min during rush.'
    when i.seed_idx = 8  then 'Diplomatic zone — minimal traffic, well-maintained roads.'
    when i.seed_idx = 9  then 'Moderate weekday traffic along Azikiwe Road corridor.'
    else 'Rumuola junction can bottleneck during school hours.'
  end
from tmp_inserted_dummy i;

-- ============================================================
-- 5. Amenities
-- ============================================================
insert into public.apartment_amenities (apartment_id, amenity)
select i.apartment_id, unnest(
  case
    when i.seed_idx = 8  then array['security','parking','prepaid_meter','fenced_compound','gate_man','generator','balcony','wardrobe','kitchen_cabinet']
    when i.seed_idx = 1  then array['security','parking','prepaid_meter','fenced_compound','gate_man','generator','water_supply','kitchen_cabinet']
    when i.seed_idx = 5  then array['security','parking','prepaid_meter','fenced_compound','gate_man','generator','water_supply','pop_ceiling']
    when i.seed_idx = 6  then array['security','parking','fenced_compound','gate_man','generator','water_supply']
    when i.seed_idx = 10 then array['security','parking','prepaid_meter','fenced_compound','generator','water_supply']
    when i.seed_idx = 3  then array['security','prepaid_meter','fenced_compound','water_supply','tiled_floor']
    when i.seed_idx = 9  then array['security','prepaid_meter','fenced_compound','water_supply','tiled_floor','wardrobe']
    when i.seed_idx = 2  then array['security','prepaid_meter','water_supply','tiled_floor']
    when i.seed_idx = 4  then array['security','prepaid_meter','water_supply','tiled_floor','wardrobe']
    else array['security','prepaid_meter','water_supply','tiled_floor','wardrobe']
  end
)
from tmp_inserted_dummy i;

-- ============================================================
-- 6. Images (one primary per listing)
-- ============================================================
insert into public.apartment_images (apartment_id, image_url, is_primary, display_order)
select
  i.apartment_id,
  'https://images.unsplash.com/photo-' ||
    case
      when i.seed_idx = 1  then '1560448204-603b3fc33ddc'
      when i.seed_idx = 2  then '1494526585095-c41746248156'
      when i.seed_idx = 3  then '1484154218962-a197022b5858'
      when i.seed_idx = 4  then '1502672260266-1c1ef2d93688'
      when i.seed_idx = 5  then '1505693416388-ac5ce068fe85'
      when i.seed_idx = 6  then '1493809842364-78817add7ffb'
      when i.seed_idx = 7  then '1460317442991-0ec209397118'
      when i.seed_idx = 8  then '1600585154526-990dced4db0d'
      when i.seed_idx = 9  then '1505691938895-1758d7feb511'
      else '1493666438817-866a91353ca9'
    end || '?auto=format&fit=crop&w=1400&q=80',
  true,
  0
from tmp_inserted_dummy i;

commit;

-- ============================================================
-- Verification query (uncomment to check):
-- ============================================================
-- select
--   a.ppid, a.title, a.city, a.lga, a.neighborhood,
--   a.apartment_type, a.annual_rent, a.total_upfront_cost,
--   p.full_name as landlord
-- from public.apartments a
-- join public.profiles p on p.id = a.landlord_id
-- order by a.created_at desc
-- limit 10;
