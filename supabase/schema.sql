-- Meter Readings POC schema
-- Run this in the Supabase SQL editor for your project.

create extension if not exists "pgcrypto";

create table if not exists properties (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  address text,
  owner_share_token uuid not null default gen_random_uuid(),
  created_at timestamptz not null default now()
);

create unique index if not exists properties_owner_share_token_idx
  on properties (owner_share_token);

create table if not exists units (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references properties (id) on delete cascade,
  unit_number text not null,
  created_at timestamptz not null default now(),
  unique (property_id, unit_number)
);

create table if not exists meter_readings (
  id uuid primary key default gen_random_uuid(),
  unit_id uuid not null references units (id) on delete cascade,
  service text not null check (service in ('electricity', 'water')),
  reading_value numeric not null,
  photo_url text,
  captured_at timestamptz not null default now(),
  notes text,
  flag_status text not null default 'ok'
    check (flag_status in ('ok', 'below_prev', 'above_2x_avg', 'possible_partial')),
  created_at timestamptz not null default now()
);

create index if not exists meter_readings_unit_service_captured_idx
  on meter_readings (unit_id, service, captured_at);

-- POC: no auth, so allow the anon key to read/write everything.
-- Tighten this once real auth is introduced.
alter table properties enable row level security;
alter table units enable row level security;
alter table meter_readings enable row level security;

drop policy if exists "public read properties" on properties;
create policy "public read properties" on properties for select using (true);
drop policy if exists "public write properties" on properties;
create policy "public write properties" on properties for insert with check (true);

drop policy if exists "public read units" on units;
create policy "public read units" on units for select using (true);
drop policy if exists "public write units" on units;
create policy "public write units" on units for insert with check (true);

drop policy if exists "public read meter_readings" on meter_readings;
create policy "public read meter_readings" on meter_readings for select using (true);
drop policy if exists "public write meter_readings" on meter_readings;
create policy "public write meter_readings" on meter_readings for insert with check (true);

-- Storage bucket for meter photos (run separately if bucket creation via SQL is unavailable
-- in your project — otherwise create a public bucket named "meter-photos" in the Storage UI).
insert into storage.buckets (id, name, public)
values ('meter-photos', 'meter-photos', true)
on conflict (id) do nothing;

drop policy if exists "public read meter-photos" on storage.objects;
create policy "public read meter-photos" on storage.objects
  for select using (bucket_id = 'meter-photos');

drop policy if exists "public upload meter-photos" on storage.objects;
create policy "public upload meter-photos" on storage.objects
  for insert with check (bucket_id = 'meter-photos');
