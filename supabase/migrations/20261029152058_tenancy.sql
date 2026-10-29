-- Phase 1 — Tenancy & access control.
--
-- Tables: profiles, farms, farm_members, invitations, farm_settings.
-- Supporting: role/status enums, membership helper functions, a generic
-- audit log + triggers, updated_at triggers, auto profile creation on signup,
-- and SECURITY DEFINER RPCs for onboarding (create_farm) and invites
-- (accept_invitation) that must bootstrap membership before the caller is a
-- member.
--
-- Rules (see docs/PROMPT.md, docs/SCHEMA.md):
--   * RLS enabled on every table; NO delete policy anywhere (soft delete only).
--   * Helper fns are SECURITY DEFINER with a fixed empty search_path so that
--     membership checks inside RLS policies do not recurse into RLS.
--   * Relies on Supabase default privileges (anon/authenticated/service_role
--     are granted on new public tables + functions automatically).

-- ---------------------------------------------------------------------------
-- Enums — roles and statuses are fixed (not farm-customisable), so enums.
-- ---------------------------------------------------------------------------
create type public.farm_role as enum ('owner', 'manager', 'vet', 'worker', 'accountant');
create type public.member_status as enum ('active', 'invited', 'suspended');
create type public.invitation_status as enum ('pending', 'accepted', 'revoked', 'expired');

-- ---------------------------------------------------------------------------
-- profiles — one row per auth user (global, not farm-scoped).
-- Created automatically by a trigger on auth.users (see handle_new_user).
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null default '',
  phone text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- farms
-- ---------------------------------------------------------------------------
create table public.farms (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(btrim(name)) > 0),
  slug text not null check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  location text,
  currency text not null default 'KES' check (currency ~ '^[A-Z]{3}$'),
  timezone text not null default 'Africa/Nairobi',
  created_at timestamptz not null default now(),
  created_by uuid references public.profiles (id),
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles (id),
  deleted_at timestamptz
);
-- Slug is unique among active farms; freed for reuse after a farm is archived.
create unique index farms_slug_active_uidx on public.farms (slug) where deleted_at is null;

-- ---------------------------------------------------------------------------
-- farm_members — a user's role within a farm.
-- ---------------------------------------------------------------------------
create table public.farm_members (
  id uuid primary key default gen_random_uuid(),
  farm_id uuid not null references public.farms (id) on delete restrict,
  user_id uuid not null references public.profiles (id) on delete restrict,
  role public.farm_role not null,
  status public.member_status not null default 'active',
  created_at timestamptz not null default now(),
  created_by uuid references public.profiles (id),
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles (id),
  deleted_at timestamptz
);
create unique index farm_members_farm_user_active_uidx
  on public.farm_members (farm_id, user_id) where deleted_at is null;
create index farm_members_user_idx on public.farm_members (user_id);
create index farm_members_farm_idx on public.farm_members (farm_id);

-- ---------------------------------------------------------------------------
-- invitations — owner/manager invites someone by email; expires in 7 days.
-- ---------------------------------------------------------------------------
create table public.invitations (
  id uuid primary key default gen_random_uuid(),
  farm_id uuid not null references public.farms (id) on delete restrict,
  email text not null check (position('@' in email) > 1),
  role public.farm_role not null,
  token uuid not null default gen_random_uuid(),
  status public.invitation_status not null default 'pending',
  expires_at timestamptz not null default (now() + interval '7 days'),
  created_at timestamptz not null default now(),
  created_by uuid references public.profiles (id),
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles (id),
  accepted_at timestamptz,
  accepted_by uuid references public.profiles (id)
);
create unique index invitations_token_uidx on public.invitations (token);
-- At most one pending invite per (farm, email).
create unique index invitations_pending_uidx
  on public.invitations (farm_id, lower(email)) where status = 'pending';
create index invitations_email_idx on public.invitations (lower(email));
create index invitations_farm_idx on public.invitations (farm_id);

-- ---------------------------------------------------------------------------
-- farm_settings — one row per farm (PK is farm_id).
-- ---------------------------------------------------------------------------
create table public.farm_settings (
  farm_id uuid primary key references public.farms (id) on delete restrict,
  date_format text not null default 'DD/MM/YYYY',
  units text not null default 'metric' check (units in ('metric', 'imperial')),
  low_stock_threshold numeric(14, 3) not null default 0 check (low_stock_threshold >= 0),
  overdue_days integer not null default 30 check (overdue_days >= 0),
  invoice_prefix text not null default 'INV',
  logo_path text,
  created_at timestamptz not null default now(),
  created_by uuid references public.profiles (id),
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles (id)
);

-- ---------------------------------------------------------------------------
-- audit_log — generic before/after capture via trigger. No farm_id-only PK
-- conventions; this table is append-only and has no soft delete.
-- ---------------------------------------------------------------------------
create table public.audit_log (
  id uuid primary key default gen_random_uuid(),
  table_name text not null,
  row_id uuid,
  farm_id uuid,
  action text not null check (action in ('INSERT', 'UPDATE', 'DELETE')),
  before jsonb,
  after jsonb,
  actor uuid,
  at timestamptz not null default now()
);
create index audit_log_farm_idx on public.audit_log (farm_id, at desc);
create index audit_log_row_idx on public.audit_log (table_name, row_id);

-- ---------------------------------------------------------------------------
-- Membership helper functions (SECURITY DEFINER to avoid RLS recursion).
-- ---------------------------------------------------------------------------
create or replace function public.is_farm_member(p_farm_id uuid)
returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.farm_members m
    where m.farm_id = p_farm_id
      and m.user_id = (select auth.uid())
      and m.status = 'active'
      and m.deleted_at is null
  );
$$;

create or replace function public.has_farm_role(p_farm_id uuid, p_roles public.farm_role[])
returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.farm_members m
    where m.farm_id = p_farm_id
      and m.user_id = (select auth.uid())
      and m.role = any (p_roles)
      and m.status = 'active'
      and m.deleted_at is null
  );
$$;

-- True when the current user shares at least one active farm with p_user_id.
-- Used by the profiles SELECT policy so members can see each other.
create or replace function public.shares_farm_with(p_user_id uuid)
returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1
    from public.farm_members me
    join public.farm_members them on them.farm_id = me.farm_id
    where me.user_id = (select auth.uid())
      and me.status = 'active' and me.deleted_at is null
      and them.user_id = p_user_id
      and them.status = 'active' and them.deleted_at is null
  );
$$;

-- ---------------------------------------------------------------------------
-- Trigger functions: profile creation, updated_at maintenance, audit.
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, full_name, phone)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    new.raw_user_meta_data ->> 'phone'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- profiles has no updated_by column.
create or replace function public.touch_updated_at()
returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- Business tables carry updated_by.
create or replace function public.set_updated_at()
returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  new.updated_by := (select auth.uid());
  return new;
end;
$$;

create or replace function public.audit_trigger()
returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_before jsonb;
  v_after jsonb;
  v_farm_id uuid;
  v_row_id uuid;
begin
  if (tg_op = 'DELETE') then
    v_before := to_jsonb(old);
  elsif (tg_op = 'UPDATE') then
    v_before := to_jsonb(old);
    v_after := to_jsonb(new);
  else
    v_after := to_jsonb(new);
  end if;

  v_farm_id := coalesce((v_after ->> 'farm_id')::uuid, (v_before ->> 'farm_id')::uuid);
  v_row_id := coalesce((v_after ->> 'id')::uuid, (v_before ->> 'id')::uuid);

  insert into public.audit_log (table_name, row_id, farm_id, action, before, after, actor)
  values (tg_table_name, v_row_id, v_farm_id, tg_op, v_before, v_after, (select auth.uid()));

  if (tg_op = 'DELETE') then
    return old;
  end if;
  return new;
end;
$$;

-- Attach updated_at + audit triggers.
create trigger profiles_touch_updated_at before update on public.profiles
  for each row execute function public.touch_updated_at();
create trigger profiles_audit after insert or update or delete on public.profiles
  for each row execute function public.audit_trigger();

create trigger farms_set_updated_at before update on public.farms
  for each row execute function public.set_updated_at();
create trigger farms_audit after insert or update or delete on public.farms
  for each row execute function public.audit_trigger();

create trigger farm_members_set_updated_at before update on public.farm_members
  for each row execute function public.set_updated_at();
create trigger farm_members_audit after insert or update or delete on public.farm_members
  for each row execute function public.audit_trigger();

create trigger invitations_set_updated_at before update on public.invitations
  for each row execute function public.set_updated_at();
create trigger invitations_audit after insert or update or delete on public.invitations
  for each row execute function public.audit_trigger();

create trigger farm_settings_set_updated_at before update on public.farm_settings
  for each row execute function public.set_updated_at();
create trigger farm_settings_audit after insert or update or delete on public.farm_settings
  for each row execute function public.audit_trigger();

-- ---------------------------------------------------------------------------
-- Onboarding + invite RPCs (SECURITY DEFINER; one transaction each).
-- ---------------------------------------------------------------------------
create or replace function public.create_farm(
  p_name text,
  p_slug text,
  p_location text default null,
  p_currency text default 'KES',
  p_timezone text default 'Africa/Nairobi'
)
returns public.farms
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := (select auth.uid());
  v_farm public.farms;
begin
  if v_uid is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;

  insert into public.farms (name, slug, location, currency, timezone, created_by, updated_by)
  values (btrim(p_name), lower(btrim(p_slug)), p_location, upper(p_currency), p_timezone, v_uid, v_uid)
  returning * into v_farm;

  insert into public.farm_members (farm_id, user_id, role, status, created_by, updated_by)
  values (v_farm.id, v_uid, 'owner', 'active', v_uid, v_uid);

  insert into public.farm_settings (farm_id, created_by, updated_by)
  values (v_farm.id, v_uid, v_uid);

  return v_farm;
end;
$$;

create or replace function public.accept_invitation(p_token uuid)
returns public.farm_members
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := (select auth.uid());
  v_email text;
  v_inv public.invitations;
  v_member public.farm_members;
begin
  if v_uid is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;

  select u.email into v_email from auth.users u where u.id = v_uid;

  select * into v_inv from public.invitations where token = p_token for update;
  if not found then
    raise exception 'invitation not found' using errcode = 'P0002';
  end if;
  if v_inv.status <> 'pending' then
    raise exception 'invitation is no longer pending';
  end if;
  if v_inv.expires_at < now() then
    update public.invitations set status = 'expired' where id = v_inv.id;
    raise exception 'invitation has expired';
  end if;
  if lower(v_inv.email) <> lower(v_email) then
    raise exception 'invitation email does not match the signed-in user';
  end if;

  insert into public.farm_members (farm_id, user_id, role, status, created_by, updated_by)
  values (v_inv.farm_id, v_uid, v_inv.role, 'active', v_uid, v_uid)
  on conflict (farm_id, user_id) where deleted_at is null
  do update set role = excluded.role, status = 'active', updated_by = v_uid
  returning * into v_member;

  update public.invitations
     set status = 'accepted', accepted_at = now(), accepted_by = v_uid
   where id = v_inv.id;

  return v_member;
end;
$$;

-- ---------------------------------------------------------------------------
-- Row Level Security. Enable on every table. No DELETE policies anywhere.
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.farms enable row level security;
alter table public.farm_members enable row level security;
alter table public.invitations enable row level security;
alter table public.farm_settings enable row level security;
alter table public.audit_log enable row level security;

-- profiles: own row, or a co-member's row.
create policy profiles_select on public.profiles for select to authenticated
  using (id = (select auth.uid()) or public.shares_farm_with(id));
create policy profiles_insert on public.profiles for insert to authenticated
  with check (id = (select auth.uid()));
create policy profiles_update on public.profiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

-- farms: members read; owner/manager update; create goes through create_farm().
create policy farms_select on public.farms for select to authenticated
  using (public.is_farm_member(id));
create policy farms_insert on public.farms for insert to authenticated
  with check (created_by = (select auth.uid()));
create policy farms_update on public.farms for update to authenticated
  using (public.has_farm_role(id, array['owner', 'manager']::public.farm_role[]))
  with check (public.has_farm_role(id, array['owner', 'manager']::public.farm_role[]));

-- farm_members: members read; only owners add/modify members.
create policy farm_members_select on public.farm_members for select to authenticated
  using (public.is_farm_member(farm_id));
create policy farm_members_insert on public.farm_members for insert to authenticated
  with check (public.has_farm_role(farm_id, array['owner']::public.farm_role[]));
create policy farm_members_update on public.farm_members for update to authenticated
  using (public.has_farm_role(farm_id, array['owner']::public.farm_role[]))
  with check (public.has_farm_role(farm_id, array['owner']::public.farm_role[]));

-- invitations: owner/manager read; only owners create/modify.
create policy invitations_select on public.invitations for select to authenticated
  using (public.has_farm_role(farm_id, array['owner', 'manager']::public.farm_role[]));
create policy invitations_insert on public.invitations for insert to authenticated
  with check (public.has_farm_role(farm_id, array['owner']::public.farm_role[]));
create policy invitations_update on public.invitations for update to authenticated
  using (public.has_farm_role(farm_id, array['owner']::public.farm_role[]))
  with check (public.has_farm_role(farm_id, array['owner']::public.farm_role[]));

-- farm_settings: members read; owner/manager update; create via create_farm().
create policy farm_settings_select on public.farm_settings for select to authenticated
  using (public.is_farm_member(farm_id));
create policy farm_settings_insert on public.farm_settings for insert to authenticated
  with check (public.has_farm_role(farm_id, array['owner']::public.farm_role[]));
create policy farm_settings_update on public.farm_settings for update to authenticated
  using (public.has_farm_role(farm_id, array['owner', 'manager']::public.farm_role[]))
  with check (public.has_farm_role(farm_id, array['owner', 'manager']::public.farm_role[]));

-- audit_log: owner/manager read within their farm. Writes only via the
-- SECURITY DEFINER audit trigger (no insert/update/delete policy).
create policy audit_log_select on public.audit_log for select to authenticated
  using (farm_id is not null and public.has_farm_role(farm_id, array['owner', 'manager']::public.farm_role[]));
