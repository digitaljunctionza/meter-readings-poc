-- ============================================================
-- 004: Review queue + meter replacement
-- ============================================================
-- Run in the Supabase SQL editor AFTER 003_rebill_client_id.sql.
--
-- Two independent features, bundled because both are additive and low-risk
-- (nullable columns, a new table, no data rewrite):
--
-- 1. Review queue — meter_readings.reviewed_at lets an admin "Accept" a
--    flagged reading (persists past reload) without deleting it. "Send
--    back" just deletes the reading — the meter reopens for recapture,
--    no schema needed for that half.
--
-- 2. Meter replacement — retiring a meter and starting a new one at the
--    same unit+service without corrupting usage math. Mirrors the
--    "retire, never reuse" approach: a physical swap gets a NEW meter
--    row, the old one is retired (not deleted), so its cumulative
--    reading history stays intact and the new meter starts its own
--    delta chain from its opening reading instead of from zero against
--    the old meter's last value.
--
-- Run the VERIFICATION block at the bottom afterwards.

-- ------------------------------------------------------------
-- 1. Review queue
-- ------------------------------------------------------------

alter table meter_readings
  add column if not exists reviewed_at timestamptz,
  add column if not exists reviewed_by uuid references auth.users (id);

-- ------------------------------------------------------------
-- 2. Meter replacement — schema
-- ------------------------------------------------------------

alter table meters
  add column if not exists serial text,
  add column if not exists retired_at timestamptz,
  add column if not exists replaced_by_meter_id uuid references meters (id);

-- Replaces the plain "one meter per unit+service" index: a unit can now
-- have any number of RETIRED meters in its history, but only one ACTIVE
-- one per service.
drop index if exists meters_unit_service_idx;
create unique index if not exists meters_unit_service_idx
  on meters (unit_id, service) where unit_id is not null and retired_at is null;

create table if not exists meter_replacements (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references properties (id) on delete cascade,
  unit_id uuid references units (id) on delete set null,
  service text not null check (service in ('electricity', 'water')),
  old_meter_id uuid not null references meters (id),
  new_meter_id uuid not null references meters (id),
  closing_reading_id uuid not null references meter_readings (id),
  opening_reading_id uuid not null references meter_readings (id),
  note text,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users (id)
);
create index if not exists meter_replacements_property_idx on meter_replacements (property_id);
alter table meter_replacements enable row level security;

drop policy if exists "admin full access meter_replacements" on meter_replacements;
create policy "admin full access meter_replacements" on meter_replacements
  for all using (is_admin()) with check (is_admin());

drop policy if exists "client reads own meter_replacements" on meter_replacements;
create policy "client reads own meter_replacements" on meter_replacements
  for select using (
    exists (
      select 1 from properties p
      join client_access ca on ca.client_id = p.client_id
      where p.id = meter_replacements.property_id and ca.user_id = auth.uid()
    )
  );

-- ------------------------------------------------------------
-- 3. record_meter_replacement() — one transaction, six writes
-- ------------------------------------------------------------
-- Closing reading on the old meter, retire the old meter, create the new
-- meter, opening reading on the new meter, link old -> new, log the
-- replacement. Order matters: the old meter must be retired BEFORE the
-- new meter is inserted, or the partial unique index above rejects the
-- new (unit_id, service) row as a duplicate of the still-active old one.

create or replace function record_meter_replacement(
  p_old_meter_id uuid,
  p_closing_value numeric,
  p_closing_photo_url text,
  p_new_serial text,
  p_opening_value numeric,
  p_opening_photo_url text,
  p_note text default null
)
returns table (new_meter_id uuid, replacement_id uuid)
language plpgsql security invoker
set search_path = public
as $$
declare
  v_old meters%rowtype;
  v_new_meter_id uuid;
  v_closing_reading_id uuid;
  v_opening_reading_id uuid;
  v_replacement_id uuid;
begin
  if not is_admin() then
    raise exception 'admin access required';
  end if;

  select * into v_old from meters where id = p_old_meter_id for update;
  if not found then
    raise exception 'meter not found';
  end if;
  if v_old.retired_at is not null then
    raise exception 'meter already retired';
  end if;

  insert into meter_readings (meter_id, reading_value, photo_url, flag_status, captured_by, unit_id, service)
  values (p_old_meter_id, p_closing_value, p_closing_photo_url, 'ok', auth.uid(), v_old.unit_id, v_old.service)
  returning id into v_closing_reading_id;

  update meters set retired_at = now() where id = p_old_meter_id;

  insert into meters (property_id, unit_id, service, label, location_note, is_communal, serial)
  values (v_old.property_id, v_old.unit_id, v_old.service, v_old.label, v_old.location_note, v_old.is_communal, p_new_serial)
  returning id into v_new_meter_id;

  update meters set replaced_by_meter_id = v_new_meter_id where id = p_old_meter_id;

  insert into meter_readings (meter_id, reading_value, photo_url, flag_status, captured_by, unit_id, service)
  values (v_new_meter_id, p_opening_value, p_opening_photo_url, 'ok', auth.uid(), v_old.unit_id, v_old.service)
  returning id into v_opening_reading_id;

  insert into meter_replacements
    (property_id, unit_id, service, old_meter_id, new_meter_id, closing_reading_id, opening_reading_id, note, created_by)
  values
    (v_old.property_id, v_old.unit_id, v_old.service, p_old_meter_id, v_new_meter_id, v_closing_reading_id, v_opening_reading_id, p_note, auth.uid())
  returning id into v_replacement_id;

  return query select v_new_meter_id, v_replacement_id;
end;
$$;

revoke all on function record_meter_replacement(uuid, numeric, text, text, numeric, text, text) from public;
grant execute on function record_meter_replacement(uuid, numeric, text, text, numeric, text, text) to authenticated;

-- ------------------------------------------------------------
-- Verification
-- ------------------------------------------------------------
select count(*) filter (where reviewed_at is not null) as reviewed_readings, count(*) as total_readings
from meter_readings;

select count(*) filter (where retired_at is not null) as retired_meters, count(*) as total_meters
from meters;

select * from meter_replacements order by created_at desc;
