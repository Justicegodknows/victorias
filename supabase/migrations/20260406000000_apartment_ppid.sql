-- Add Platform Property ID (PPID) for apartments
-- Format: PPID-<STATE>-<LGA>-<UNIQUE_SUFFIX>

alter table public.apartments
  add column ppid text;

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

update public.apartments
set ppid = public.generate_apartment_ppid(id, city, lga)
where ppid is null;

alter table public.apartments
  alter column ppid set not null;

alter table public.apartments
  add constraint apartments_ppid_key unique (ppid);
