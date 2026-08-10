-- ============================================================
-- 002: Clients (body corporates) + Meters as first-class entities
-- ============================================================
-- Run in the Supabase SQL editor AFTER 001_auth_access_control.sql.
--
-- This touches LIVE DATA (~678 readings). The SQL editor runs the whole
-- script as one transaction, so a failure anywhere rolls the lot back —
-- do not add BEGIN/COMMIT, and do not run it in pieces.
--
-- Run the VERIFICATION block at the bottom afterwards and check the
-- numbers before treating this as done.

-- ------------------------------------------------------------
-- 1. New tables
-- ------------------------------------------------------------

create table if not exists clients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  contact_email text,
  created_at timestamptz not null default now()
);
alter table clients enable row level security;

create table if not exists client_access (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  granted_at timestamptz not null default now(),
  unique (client_id, user_id)
);
alter table client_access enable row level security;

create table if not exists meters (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references properties (id) on delete cascade,
  unit_id uuid references units (id) on delete set null,
  service text not null check (service in ('electricity', 'water')),
  label text not null,
  location_note text,
  is_communal boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists meters_property_idx on meters (property_id);
-- One meter per unit per service. Communal meters (unit_id null) are exempt.
create unique index if not exists meters_unit_service_idx
  on meters (unit_id, service) where unit_id is not null;
alter table meters enable row level security;

-- ------------------------------------------------------------
-- 2. properties.client_id, and the holding client for existing data
-- ------------------------------------------------------------
-- Tarragon Place is itself one of Wayne's clients, so the existing
-- property is filed under a client of the same name. Tarragon Two gets
-- added later as a SEPARATE client via the admin UI.

alter table properties
  add column if not exists client_id uuid references clients (id) on delete restrict;

do $$
declare
  v_client_id uuid;
begin
  if exists (select 1 from properties where client_id is null) then
    insert into clients (name) values ('Tarragon Place') returning id into v_client_id;
    update properties set client_id = v_client_id where client_id is null;
  end if;
end $$;

alter table properties alter column client_id set not null;

-- ------------------------------------------------------------
-- 3. meter_readings gains meter_id + captured_by
-- ------------------------------------------------------------
-- captured_by is nullable: historical imported rows have no known capturer.

alter table meter_readings
  add column if not exists meter_id uuid references meters (id) on delete cascade;
alter table meter_readings
  add column if not exists captured_by uuid references auth.users (id);

-- The legacy unit_id must become optional. Communal meters created via the
-- new Meters screen have no unit at all, so readings against them cannot
-- supply one — and unit_id is only retained here for rollback safety anyway.
alter table meter_readings alter column unit_id drop not null;

-- ------------------------------------------------------------
-- 4. Backfill meters from the (unit_id, service) pairs that have readings
-- ------------------------------------------------------------
-- Units with no readings get no meter — Wayne adds those via the Meters
-- screen. is_communal is inferred: numeric unit numbers (101-153) are
-- per-unit; named ones ("Main Water Meter", "Public 1", "Outside",
-- "Spare 2", ...) are communal.

insert into meters (property_id, unit_id, service, label, is_communal)
select distinct
  u.property_id,
  u.id,
  r.service,
  u.unit_number || ' - ' || initcap(r.service),
  (u.unit_number !~ '^[0-9]+$')
from meter_readings r
join units u on u.id = r.unit_id
where not exists (
  select 1 from meters m where m.unit_id = r.unit_id and m.service = r.service
);

-- ------------------------------------------------------------
-- 5. Point every reading at its meter
-- ------------------------------------------------------------
-- The SET NOT NULL below is the safety net: if any reading failed to
-- match a meter, this errors and the whole migration rolls back rather
-- than silently orphaning data.

update meter_readings r
set meter_id = m.id
from meters m
where r.meter_id is null
  and m.unit_id = r.unit_id
  and m.service = r.service;

alter table meter_readings alter column meter_id set not null;

-- ------------------------------------------------------------
-- 6. property_access -> client_access
-- ------------------------------------------------------------
-- Several properties can map to one client, hence distinct + on conflict.

insert into client_access (client_id, user_id)
select distinct p.client_id, pa.user_id
from property_access pa
join properties p on p.id = pa.property_id
on conflict (client_id, user_id) do nothing;

-- ------------------------------------------------------------
-- 7. property_invites becomes client-scoped
-- ------------------------------------------------------------

alter table property_invites
  add column if not exists client_id uuid references clients (id) on delete cascade;

update property_invites i
set client_id = p.client_id
from properties p
where p.id = i.property_id and i.client_id is null;

-- An invite whose property vanished can't be salvaged. Invites are
-- short-lived and re-issuable, so drop rather than block the NOT NULL.
delete from property_invites where client_id is null;

alter table property_invites alter column client_id set not null;
alter table property_invites alter column property_id drop not null;

-- ------------------------------------------------------------
-- 8. Role rename: 'owner' -> 'client'
-- ------------------------------------------------------------

alter table profiles drop constraint if exists profiles_role_check;
update profiles set role = 'client' where role = 'owner';
alter table profiles alter column role set default 'client';
alter table profiles add constraint profiles_role_check check (role in ('admin', 'client'));

-- ------------------------------------------------------------
-- 9. RLS rewrite
-- ------------------------------------------------------------

-- clients ----------------------------------------------------
drop policy if exists "admin full access clients" on clients;
create policy "admin full access clients" on clients
  for all using (is_admin()) with check (is_admin());

drop policy if exists "client reads own client" on clients;
create policy "client reads own client" on clients
  for select using (
    exists (
      select 1 from client_access ca
      where ca.client_id = clients.id and ca.user_id = auth.uid()
    )
  );

-- client_access ----------------------------------------------
-- Deliberately does NOT reference `clients`: the clients policy above
-- queries this table, so a reverse reference here would recurse forever.
drop policy if exists "self or admin read client_access" on client_access;
create policy "self or admin read client_access" on client_access
  for select using (user_id = auth.uid() or is_admin());

drop policy if exists "admin write client_access" on client_access;
create policy "admin write client_access" on client_access
  for insert with check (is_admin());

drop policy if exists "admin delete client_access" on client_access;
create policy "admin delete client_access" on client_access
  for delete using (is_admin());

-- properties -------------------------------------------------
drop policy if exists "owner read own properties" on properties;
drop policy if exists "client reads own properties" on properties;
create policy "client reads own properties" on properties
  for select using (
    exists (
      select 1 from client_access ca
      where ca.client_id = properties.client_id and ca.user_id = auth.uid()
    )
  );

-- units ------------------------------------------------------
drop policy if exists "owner read own units" on units;
drop policy if exists "client reads own units" on units;
create policy "client reads own units" on units
  for select using (
    exists (
      select 1 from properties p
      join client_access ca on ca.client_id = p.client_id
      where p.id = units.property_id and ca.user_id = auth.uid()
    )
  );

-- meters -----------------------------------------------------
drop policy if exists "admin full access meters" on meters;
create policy "admin full access meters" on meters
  for all using (is_admin()) with check (is_admin());

drop policy if exists "client reads own meters" on meters;
create policy "client reads own meters" on meters
  for select using (
    exists (
      select 1 from properties p
      join client_access ca on ca.client_id = p.client_id
      where p.id = meters.property_id and ca.user_id = auth.uid()
    )
  );

-- meter_readings ---------------------------------------------
-- New join path: readings -> meters -> properties -> client_access.
-- The old policy joined through units; that path no longer authorises.
drop policy if exists "owner read own meter_readings" on meter_readings;
drop policy if exists "client reads own meter_readings" on meter_readings;
create policy "client reads own meter_readings" on meter_readings
  for select using (
    exists (
      select 1 from meters m
      join properties p on p.id = m.property_id
      join client_access ca on ca.client_id = p.client_id
      where m.id = meter_readings.meter_id and ca.user_id = auth.uid()
    )
  );

-- property_invites stays admin-only; existing policies remain correct.

-- ------------------------------------------------------------
-- 10. Invite functions become client-scoped
-- ------------------------------------------------------------
-- CREATE OR REPLACE cannot change a function's return type, so both are
-- dropped first. get_invite_preview's returned column is renamed
-- property_name -> client_name; the invite page reads it BY NAME, so the
-- app must be updated in the same deploy or it fails silently.

drop function if exists redeem_invite(uuid);
create function redeem_invite(p_token uuid)
returns table (client_id uuid, client_name text)
language plpgsql security definer
set search_path = public
as $$
declare
  v_invite property_invites%rowtype;
begin
  select * into v_invite from property_invites
    where token = p_token and status = 'pending' and expires_at > now()
    for update;

  if not found then
    raise exception 'invalid_or_expired_invite';
  end if;

  insert into client_access (client_id, user_id)
  values (v_invite.client_id, auth.uid())
  on conflict (client_id, user_id) do nothing;

  update property_invites
    set status = 'used', used_by = auth.uid(), used_at = now()
    where id = v_invite.id;

  return query select c.id, c.name from clients c where c.id = v_invite.client_id;
end;
$$;

revoke all on function redeem_invite(uuid) from public;
grant execute on function redeem_invite(uuid) to authenticated;

drop function if exists get_invite_preview(uuid);
create function get_invite_preview(p_token uuid)
returns table (client_name text, valid boolean)
language sql security definer
set search_path = public
as $$
  select c.name, (i.status = 'pending' and i.expires_at > now())
  from property_invites i
  join clients c on c.id = i.client_id
  where i.token = p_token;
$$;

revoke all on function get_invite_preview(uuid) from public;
grant execute on function get_invite_preview(uuid) to anon, authenticated;

-- ============================================================
-- NOTE: meter_readings.unit_id and .service are deliberately KEPT.
-- They are redundant once meter_id is set, but retaining them makes this
-- migration reversible and lets the currently-deployed app keep working
-- if the deploy has to be rolled back. Migration 003 drops them once the
-- rewritten app is proven in production.
-- ============================================================
