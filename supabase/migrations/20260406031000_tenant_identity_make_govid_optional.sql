-- Victoria's Apartment Finder — Make tenant government ID optional
-- Migration: 20260406031000_tenant_identity_make_govid_optional

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
