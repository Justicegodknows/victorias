-- Victoria's Apartment Finder — Rental Price Index (RPI)
-- Migration: 20260406010000_rpi_index

-- ============================================================
-- 1. Historical rental transactions
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

create index idx_rental_transactions_scope
  on public.rental_transactions(city, lga, apartment_type, lease_start_date desc);

create index idx_rental_transactions_apartment
  on public.rental_transactions(apartment_id);

alter table public.rental_transactions enable row level security;

create policy "Anyone can read rental transactions"
  on public.rental_transactions for select using (true);

create policy "Service role can manage rental transactions"
  on public.rental_transactions for insert with check (auth.role() = 'service_role');

create policy "Service role can update rental transactions"
  on public.rental_transactions for update using (auth.role() = 'service_role');

create policy "Service role can delete rental transactions"
  on public.rental_transactions for delete using (auth.role() = 'service_role');

-- ============================================================
-- 2. Monthly inflation rates (state-level)
-- ============================================================
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

create index idx_inflation_rates_period
  on public.inflation_rates(state_code, year, month);

alter table public.inflation_rates enable row level security;

create policy "Anyone can read inflation rates"
  on public.inflation_rates for select using (true);

create policy "Service role can manage inflation rates"
  on public.inflation_rates for insert with check (auth.role() = 'service_role');

create policy "Service role can update inflation rates"
  on public.inflation_rates for update using (auth.role() = 'service_role');

create policy "Service role can delete inflation rates"
  on public.inflation_rates for delete using (auth.role() = 'service_role');

-- ============================================================
-- 3. Computed monthly RPI per LGA
-- ============================================================
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

create index idx_lga_rpi_lookup
  on public.lga_rpi_monthly(city, lga, apartment_type, year, month desc);

alter table public.lga_rpi_monthly enable row level security;

create policy "Anyone can read LGA RPI"
  on public.lga_rpi_monthly for select using (true);

create policy "Service role can manage LGA RPI"
  on public.lga_rpi_monthly for insert with check (auth.role() = 'service_role');

create policy "Service role can update LGA RPI"
  on public.lga_rpi_monthly for update using (auth.role() = 'service_role');

create policy "Service role can delete LGA RPI"
  on public.lga_rpi_monthly for delete using (auth.role() = 'service_role');

-- ============================================================
-- 4. Helpers & computation functions
-- ============================================================
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

create or replace function public.compute_lga_rpi(
  target_year integer default extract(year from now())::integer,
  target_month integer default extract(month from now())::integer,
  filter_city text default null,
  filter_lga text default null,
  filter_apartment_type text default 'all'
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  period_start date;
  period_end date;
  previous_year integer;
  previous_month integer;
  rows_affected integer;
begin
  if target_month < 1 or target_month > 12 then
    raise exception 'target_month must be between 1 and 12';
  end if;

  period_start := make_date(target_year, target_month, 1);
  period_end := (period_start + interval '1 month')::date;

  if target_month = 1 then
    previous_year := target_year - 1;
    previous_month := 12;
  else
    previous_year := target_year;
    previous_month := target_month - 1;
  end if;

  with comp_keys as (
    select distinct
      a.city,
      public.city_to_state_code(a.city) as state_code,
      a.lga,
      case
        when filter_apartment_type = 'all' then 'all'
        else a.apartment_type
      end as apartment_type
    from public.apartments a
    where a.is_available = true
      and (filter_city is null or a.city = filter_city)
      and (filter_lga is null or a.lga = filter_lga)
      and (filter_apartment_type = 'all' or a.apartment_type = filter_apartment_type)
  ),
  hist_keys as (
    select distinct
      rt.city,
      public.city_to_state_code(rt.city) as state_code,
      rt.lga,
      case
        when filter_apartment_type = 'all' then 'all'
        else rt.apartment_type
      end as apartment_type
    from public.rental_transactions rt
    where rt.lease_start_date < period_end
      and rt.lease_start_date >= (period_start - interval '5 years')
      and (filter_city is null or rt.city = filter_city)
      and (filter_lga is null or rt.lga = filter_lga)
      and (filter_apartment_type = 'all' or rt.apartment_type = filter_apartment_type)
  ),
  keys as (
    select * from comp_keys
    union
    select * from hist_keys
  ),
  hist_adjusted as (
    select
      k.city,
      k.state_code,
      k.lga,
      k.apartment_type,
      percentile_cont(0.5) within group (
        order by (
          rt.annual_rent * exp(coalesce(sum(ln(1 + ir.monthly_rate)), 0))
        )
      )::numeric(12, 2) as hist_component,
      count(*)::integer as sample_size_hist
    from keys k
    join public.rental_transactions rt
      on rt.city = k.city
      and rt.lga = k.lga
      and (
        k.apartment_type = 'all'
        or rt.apartment_type = k.apartment_type
      )
      and rt.lease_start_date < period_end
      and rt.lease_start_date >= (period_start - interval '5 years')
    left join public.inflation_rates ir
      on ir.state_code = k.state_code
      and make_date(ir.year, ir.month, 1) >= date_trunc('month', rt.lease_start_date)::date
      and make_date(ir.year, ir.month, 1) < period_start
    group by k.city, k.state_code, k.lga, k.apartment_type
  ),
  comp_current as (
    select
      k.city,
      k.state_code,
      k.lga,
      k.apartment_type,
      percentile_cont(0.5) within group (order by a.annual_rent)::numeric(12, 2) as comp_component,
      count(*)::integer as sample_size_comp
    from keys k
    join public.apartments a
      on a.city = k.city
      and a.lga = k.lga
      and a.is_available = true
      and (
        k.apartment_type = 'all'
        or a.apartment_type = k.apartment_type
      )
    group by k.city, k.state_code, k.lga, k.apartment_type
  ),
  current_inflation as (
    select
      k.city,
      k.state_code,
      k.lga,
      k.apartment_type,
      coalesce(ir.monthly_rate, 0)::numeric(8, 6) as inflation_component
    from keys k
    left join public.inflation_rates ir
      on ir.state_code = k.state_code
      and ir.year = target_year
      and ir.month = target_month
  ),
  previous_rpi as (
    select
      r.city,
      r.lga,
      r.apartment_type,
      r.rpi_value
    from public.lga_rpi_monthly r
    where r.year = previous_year
      and r.month = previous_month
  ),
  final_rows as (
    select
      k.city,
      k.state_code,
      k.lga,
      k.apartment_type,
      target_year as year,
      target_month as month,
      h.hist_component,
      c.comp_component,
      coalesce(i.inflation_component, 0) as inflation_component,
      coalesce(h.sample_size_hist, 0) as sample_size_hist,
      coalesce(c.sample_size_comp, 0) as sample_size_comp,
      case
        when h.hist_component is null and c.comp_component is null and p.rpi_value is not null then p.rpi_value
        when h.hist_component is null and c.comp_component is not null then c.comp_component
        when h.hist_component is not null and c.comp_component is null then h.hist_component
        when h.hist_component is not null and c.comp_component is not null then
          round(
            (
              (0.60 * h.hist_component)
              + (0.30 * c.comp_component)
              + (0.10 * coalesce(p.rpi_value, ((0.60 * h.hist_component) + (0.30 * c.comp_component))))
            )::numeric,
            2
          )
        else null
      end as rpi_value
    from keys k
    left join hist_adjusted h
      on h.city = k.city and h.lga = k.lga and h.apartment_type = k.apartment_type
    left join comp_current c
      on c.city = k.city and c.lga = k.lga and c.apartment_type = k.apartment_type
    left join current_inflation i
      on i.city = k.city and i.lga = k.lga and i.apartment_type = k.apartment_type
    left join previous_rpi p
      on p.city = k.city and p.lga = k.lga and p.apartment_type = k.apartment_type
  )
  insert into public.lga_rpi_monthly (
    city,
    state_code,
    lga,
    apartment_type,
    year,
    month,
    rpi_value,
    hist_component,
    comp_component,
    inflation_component,
    sample_size_hist,
    sample_size_comp,
    computed_at
  )
  select
    city,
    state_code,
    lga,
    apartment_type,
    year,
    month,
    rpi_value,
    hist_component,
    comp_component,
    inflation_component,
    sample_size_hist,
    sample_size_comp,
    now()
  from final_rows
  where rpi_value is not null
  on conflict (city, lga, apartment_type, year, month)
  do update set
    rpi_value = excluded.rpi_value,
    hist_component = excluded.hist_component,
    comp_component = excluded.comp_component,
    inflation_component = excluded.inflation_component,
    sample_size_hist = excluded.sample_size_hist,
    sample_size_comp = excluded.sample_size_comp,
    computed_at = excluded.computed_at;

  get diagnostics rows_affected = row_count;
  return rows_affected;
end;
$$;

grant execute on function public.compute_lga_rpi(integer, integer, text, text, text) to authenticated;

drop function if exists public.get_lga_rpi(text, text, text, integer, integer);
create or replace function public.get_lga_rpi(
  p_city text,
  p_lga text,
  p_apartment_type text default 'all',
  p_year integer default null,
  p_month integer default null
)
returns table (
  city text,
  state_code text,
  lga text,
  apartment_type text,
  year integer,
  month integer,
  rpi_value numeric,
  hist_component numeric,
  comp_component numeric,
  inflation_component numeric,
  sample_size_hist integer,
  sample_size_comp integer,
  trend text,
  trend_percent numeric
)
language sql
stable
as $$
  with target as (
    select r.*
    from public.lga_rpi_monthly r
    where r.city = p_city
      and r.lga = p_lga
      and r.apartment_type = coalesce(p_apartment_type, 'all')
      and (
        (p_year is not null and p_month is not null and r.year = p_year and r.month = p_month)
        or
        (p_year is null and p_month is null)
      )
    order by r.year desc, r.month desc
    limit 1
  ),
  prev as (
    select r.*
    from public.lga_rpi_monthly r
    join target t on t.city = r.city and t.lga = r.lga and t.apartment_type = r.apartment_type
    where make_date(r.year, r.month, 1) = (make_date(t.year, t.month, 1) - interval '1 month')::date
    limit 1
  )
  select
    t.city,
    t.state_code,
    t.lga,
    t.apartment_type,
    t.year,
    t.month,
    t.rpi_value,
    t.hist_component,
    t.comp_component,
    t.inflation_component,
    t.sample_size_hist,
    t.sample_size_comp,
    case
      when p.rpi_value is null then 'stable'
      when t.rpi_value > p.rpi_value then 'up'
      when t.rpi_value < p.rpi_value then 'down'
      else 'stable'
    end as trend,
    case
      when p.rpi_value is null or p.rpi_value = 0 then 0
      else round((((t.rpi_value - p.rpi_value) / p.rpi_value) * 100)::numeric, 2)
    end as trend_percent
  from target t
  left join prev p on true;
$$;

grant execute on function public.get_lga_rpi(text, text, text, integer, integer) to authenticated;

-- ============================================================
-- 5. Bootstrap historical transaction records from listings
-- ============================================================
insert into public.rental_transactions (
  apartment_id,
  city,
  lga,
  neighborhood,
  apartment_type,
  annual_rent,
  lease_start_date,
  lease_end_date,
  source
)
select
  a.id,
  a.city,
  a.lga,
  a.neighborhood,
  a.apartment_type,
  a.annual_rent,
  date_trunc('month', a.created_at)::date,
  (date_trunc('month', a.created_at) + interval '1 year')::date,
  'listing_snapshot'
from public.apartments a
where not exists (
  select 1
  from public.rental_transactions rt
  where rt.apartment_id = a.id
    and rt.source = 'listing_snapshot'
);

-- Seed current month RPI with available data.
select public.compute_lga_rpi();
