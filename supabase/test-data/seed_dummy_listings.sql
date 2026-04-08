-- Seed 10 dummy apartment listings for local/dev testing.
-- Safe to run multiple times: existing rows with same title are skipped.
--
-- Usage:
--   supabase db reset        (optional)
--   psql "$SUPABASE_DB_URL" -f supabase/test-data/seed_dummy_listings.sql

begin;

do $$
begin
  if not exists (select 1 from public.profiles) then
    raise exception 'No rows found in public.profiles. Create at least one authenticated user/profile first.';
  end if;
end $$;

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
  seed_idx,
  title,
  description,
  apartment_type,
  annual_rent,
  deposit,
  agent_fee,
  address,
  city,
  lga,
  neighborhood,
  latitude,
  longitude
)
values
  (1, '[DUMMY] Lekki 2BR in gated estate', 'Modern 2-bedroom apartment in Lekki with strong estate security and stable water supply.', '2-bedroom', 2800000, 280000, 280000, '12 Admiralty Way, Lekki Phase 1', 'lagos', 'Eti-Osa', 'Lekki Phase 1', 6.4470::double precision, 3.4720::double precision),
  (2, '[DUMMY] Yaba mini-flat near tech hub', 'Compact mini-flat with easy access to Yaba tech ecosystem and bus routes.', 'mini-flat', 950000, 95000, 95000, '17 Herbert Macaulay Way, Yaba', 'lagos', 'Lagos Mainland', 'Yaba', 6.5095::double precision, 3.3792::double precision),
  (3, '[DUMMY] Ikeja 1BR close to Allen', 'Well-finished 1-bedroom in Ikeja with prepaid meter and fenced compound.', '1-bedroom', 1400000, 140000, 140000, '22 Opebi Road, Ikeja', 'lagos', 'Ikeja', 'Ikeja', 6.6018::double precision, 3.3515::double precision),
  (4, '[DUMMY] Surulere self-contained starter home', 'Affordable self-contained unit in Surulere, ideal for young professionals.', 'self-contained', 480000, 50000, 50000, '8 Bode Thomas Street, Surulere', 'lagos', 'Surulere', 'Surulere', 6.5001::double precision, 3.3539::double precision),
  (5, '[DUMMY] Wuse 2 serviced 2BR', 'Serviced 2-bedroom apartment with excellent road access and strong power reliability.', '2-bedroom', 3600000, 360000, 360000, '14 Aminu Kano Crescent, Wuse 2', 'abuja', 'Abuja Municipal', 'Wuse 2', 9.0819::double precision, 7.4727::double precision),
  (6, '[DUMMY] Gwarinpa 3BR family apartment', 'Spacious 3-bedroom flat in a family-friendly district with parking and gate man.', '3-bedroom', 2400000, 240000, 240000, '3 69 Road, Gwarinpa', 'abuja', 'Abuja Municipal', 'Gwarinpa', 9.1193::double precision, 7.3986::double precision),
  (7, '[DUMMY] Kubwa budget mini-flat', 'Budget mini-flat for commuters, close to neighborhood markets.', 'mini-flat', 650000, 65000, 65000, '5 Arab Road, Kubwa', 'abuja', 'Bwari', 'Kubwa', 9.1549::double precision, 7.3226::double precision),
  (8, '[DUMMY] Maitama premium duplex', 'Premium duplex with excellent security and high-end finishing.', 'duplex', 12500000, 1250000, 1250000, '4 Aguiyi Ironsi Street, Maitama', 'abuja', 'Abuja Municipal', 'Maitama', 9.0904::double precision, 7.5028::double precision),
  (9, '[DUMMY] PH GRA Phase 2 1BR', 'Comfortable 1-bedroom in GRA Phase 2 with good water and security profile.', '1-bedroom', 1200000, 120000, 120000, '9 Tombia Street, GRA Phase 2', 'port-harcourt', 'Obio-Akpor', 'GRA Phase 2', 4.8156::double precision, 7.0335::double precision),
  (10, '[DUMMY] Rumuola 2BR with prepaid meter', '2-bedroom unit in Rumuola with fenced compound and steady accessibility.', '2-bedroom', 1500000, 150000, 150000, '11 Aba Road, Rumuola', 'port-harcourt', 'Obio-Akpor', 'Rumuola', 4.8462::double precision, 7.0189::double precision);

create temporary table tmp_inserted_dummy (
  apartment_id uuid not null,
  seed_idx integer not null,
  title text not null
) on commit drop;

with profile_pool as (
  select
    id,
    row_number() over (order by created_at, id) as rn,
    count(*) over () as total_profiles
  from public.profiles
),
inserted_apartments as (
  insert into public.apartments (
    landlord_id,
    title,
    description,
    apartment_type,
    annual_rent,
    deposit,
    agent_fee,
    address,
    city,
    lga,
    neighborhood,
    latitude,
    longitude,
    is_verified,
    is_available
  )
  select
    (
      select p.id
      from profile_pool p
      where p.rn = ((s.seed_idx - 1) % (select max(total_profiles) from profile_pool)) + 1
    ) as landlord_id,
    s.title,
    s.description,
    s.apartment_type,
    s.annual_rent,
    s.deposit,
    s.agent_fee,
    s.address,
    s.city,
    s.lga,
    s.neighborhood,
    s.latitude,
    s.longitude,
    true,
    true
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

insert into public.environmental_factors (
  apartment_id,
  flood_risk,
  power_supply_rating,
  water_supply_rating,
  security_rating,
  road_condition_rating,
  nearest_bus_stop,
  nearest_market,
  nearest_hospital,
  traffic_notes
)
select
  i.apartment_id,
  case
    when i.seed_idx in (2, 4, 10) then 'medium'
    when i.seed_idx in (1, 5, 8) then 'low'
    when i.seed_idx = 9 then 'high'
    else 'low'
  end,
  case
    when i.seed_idx in (5, 8) then 5
    when i.seed_idx in (1, 3, 6, 9, 10) then 4
    when i.seed_idx in (2, 4, 7) then 3
    else 3
  end,
  case
    when i.seed_idx in (1, 5, 8) then 4
    when i.seed_idx in (2, 4, 7, 10) then 3
    else 4
  end,
  case
    when i.seed_idx in (5, 8) then 5
    when i.seed_idx in (1, 3, 6, 9, 10) then 4
    else 3
  end,
  case
    when i.seed_idx in (2, 4, 7) then 3
    when i.seed_idx in (1, 3, 6, 9, 10) then 4
    when i.seed_idx in (5, 8) then 5
    else 3
  end,
  case
    when i.seed_idx = 1 then 'Lekki Phase 1 Bus Stop'
    when i.seed_idx = 2 then 'Sabo Bus Stop'
    when i.seed_idx = 3 then 'Allen Junction'
    when i.seed_idx = 4 then 'Ojuelegba Bus Stop'
    when i.seed_idx = 5 then 'Banex Junction'
    when i.seed_idx = 6 then 'Gwarinpa 1st Avenue'
    when i.seed_idx = 7 then 'Kubwa FO1'
    when i.seed_idx = 8 then 'Maitama Roundabout'
    when i.seed_idx = 9 then 'GRA Junction'
    else 'Rumuola Junction'
  end,
  case
    when i.seed_idx in (1, 2, 3, 4) then 'Local neighborhood market'
    when i.seed_idx in (5, 6, 8) then 'Wuse Market'
    when i.seed_idx = 7 then 'Kubwa Village Market'
    when i.seed_idx = 9 then 'Mile 1 Market'
    else 'Rumuola Market'
  end,
  case
    when i.seed_idx in (1, 2, 3, 4) then 'General Hospital'
    when i.seed_idx in (5, 6, 7, 8) then 'National Hospital Abuja'
    else 'University of Port Harcourt Teaching Hospital'
  end,
  case
    when i.seed_idx in (1, 2, 4, 7) then 'Peak hour traffic can be heavy.'
    when i.seed_idx in (5, 8) then 'Generally smooth roads with occasional peak congestion.'
    else 'Moderate traffic during weekdays.'
  end
from tmp_inserted_dummy i;

insert into public.apartment_amenities (apartment_id, amenity)
select
  i.apartment_id,
  unnest(
    case
      when i.seed_idx = 8 then array['security','parking','prepaid_meter','fenced_compound','gate_man','generator','balcony','wardrobe','kitchen_cabinet']
      when i.seed_idx in (1,5,6,10) then array['security','parking','prepaid_meter','fenced_compound','gate_man','generator','water_supply']
      when i.seed_idx in (2,3,9) then array['security','prepaid_meter','fenced_compound','water_supply','tiled_floor']
      else array['security','prepaid_meter','water_supply','tiled_floor','wardrobe']
    end
  )
from tmp_inserted_dummy i;

insert into public.apartment_images (apartment_id, image_url, is_primary, display_order)
select
  i.apartment_id,
  'https://images.unsplash.com/photo-' ||
    case
      when i.seed_idx = 1 then '1560448204-603b3fc33ddc'
      when i.seed_idx = 2 then '1494526585095-c41746248156'
      when i.seed_idx = 3 then '1484154218962-a197022b5858'
      when i.seed_idx = 4 then '1502672260266-1c1ef2d93688'
      when i.seed_idx = 5 then '1505693416388-ac5ce068fe85'
      when i.seed_idx = 6 then '1493809842364-78817add7ffb'
      when i.seed_idx = 7 then '1460317442991-0ec209397118'
      when i.seed_idx = 8 then '1600585154526-990dced4db0d'
      when i.seed_idx = 9 then '1505691938895-1758d7feb511'
      else '1493666438817-866a91353ca9'
    end || '?auto=format&fit=crop&w=1400&q=80',
  true,
  0
from tmp_inserted_dummy i;

commit;

-- Quick verification:
-- select ppid, title, city, lga, annual_rent, total_upfront_cost
-- from public.apartments
-- where title like '[DUMMY]%'
-- order by created_at desc;
