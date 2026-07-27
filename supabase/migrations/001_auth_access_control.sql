-- Auth & access control migration.
-- Run this in the Supabase SQL editor AFTER schema.sql / seed.sql.
-- Prereq (Supabase dashboard, Authentication settings):
--   - Email provider enabled
--   - "Confirm email" disabled (no transactional email service in this app)

-- ============ profiles ============

create table if not exists profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role text not null default 'owner' check (role in ('admin', 'owner')),
  full_name text,
  created_at timestamptz not null default now()
);

alter table profiles enable row level security;

-- Auto-create a profile row for every new auth user.
create or replace function handle_new_user()
returns trigger
language plpgsql security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, new.raw_user_meta_data ->> 'full_name');
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ============ is_admin() helper ============

create or replace function is_admin()
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (
    select 1 from profiles where id = auth.uid() and role = 'admin'
  );
$$;

revoke all on function is_admin() from public;
grant execute on function is_admin() to authenticated;

-- ============ property_access ============

create table if not exists property_access (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references properties (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  granted_at timestamptz not null default now(),
  unique (property_id, user_id)
);

alter table property_access enable row level security;

-- ============ property_invites ============

create table if not exists property_invites (
  id uuid primary key default gen_random_uuid(),
  token uuid not null default gen_random_uuid(),
  property_id uuid not null references properties (id) on delete cascade,
  created_by uuid not null references auth.users (id),
  email text,
  status text not null default 'pending' check (status in ('pending', 'used', 'revoked')),
  used_by uuid references auth.users (id),
  used_at timestamptz,
  expires_at timestamptz not null default (now() + interval '14 days'),
  created_at timestamptz not null default now()
);

create unique index if not exists property_invites_token_idx on property_invites (token);

alter table property_invites enable row level security;

-- ============ drop the old anonymous-share-link column ============

drop index if exists properties_owner_share_token_idx;
alter table properties drop column if exists owner_share_token;

-- ============ RLS: properties ============

drop policy if exists "public read properties" on properties;
drop policy if exists "public write properties" on properties;

create policy "admin full access properties" on properties
  for all using (is_admin()) with check (is_admin());

create policy "owner read own properties" on properties
  for select using (
    exists (
      select 1 from property_access pa
      where pa.property_id = properties.id and pa.user_id = auth.uid()
    )
  );

-- ============ RLS: units ============

drop policy if exists "public read units" on units;
drop policy if exists "public write units" on units;

create policy "admin full access units" on units
  for all using (is_admin()) with check (is_admin());

create policy "owner read own units" on units
  for select using (
    exists (
      select 1 from property_access pa
      where pa.property_id = units.property_id and pa.user_id = auth.uid()
    )
  );

-- ============ RLS: meter_readings ============

drop policy if exists "public read meter_readings" on meter_readings;
drop policy if exists "public write meter_readings" on meter_readings;

create policy "admin full access meter_readings" on meter_readings
  for all using (is_admin()) with check (is_admin());

create policy "owner read own meter_readings" on meter_readings
  for select using (
    exists (
      select 1
      from units u
      join property_access pa on pa.property_id = u.property_id
      where u.id = meter_readings.unit_id and pa.user_id = auth.uid()
    )
  );

-- ============ RLS: profiles ============

drop policy if exists "self or admin read profiles" on profiles;
create policy "self or admin read profiles" on profiles
  for select using (id = auth.uid() or is_admin());

drop policy if exists "self update profile" on profiles;
create policy "self update profile" on profiles
  for update using (id = auth.uid()) with check (id = auth.uid());

-- RLS row-filters don't restrict which COLUMNS a client can change, so without
-- this, any logged-in user could PATCH their own row's `role` to 'admin' via a
-- raw API call even though the app UI never exposes that. Column-level grants
-- are enforced independently of RLS by PostgREST, closing that gap.
revoke update on profiles from authenticated;
grant update (full_name) on profiles to authenticated;

-- ============ RLS: property_access ============

drop policy if exists "self or admin read property_access" on property_access;
create policy "self or admin read property_access" on property_access
  for select using (user_id = auth.uid() or is_admin());

drop policy if exists "admin write property_access" on property_access;
create policy "admin write property_access" on property_access
  for insert with check (is_admin());

drop policy if exists "admin delete property_access" on property_access;
create policy "admin delete property_access" on property_access
  for delete using (is_admin());

-- ============ RLS: property_invites ============

drop policy if exists "admin read property_invites" on property_invites;
create policy "admin read property_invites" on property_invites
  for select using (is_admin());

drop policy if exists "admin write property_invites" on property_invites;
create policy "admin write property_invites" on property_invites
  for insert with check (is_admin());

drop policy if exists "admin update property_invites" on property_invites;
create policy "admin update property_invites" on property_invites
  for update using (is_admin());

-- ============ redeem_invite RPC ============

create or replace function redeem_invite(p_token uuid)
returns table (property_id uuid, property_name text)
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

  insert into property_access (property_id, user_id)
  values (v_invite.property_id, auth.uid())
  on conflict (property_id, user_id) do nothing;

  update property_invites
    set status = 'used', used_by = auth.uid(), used_at = now()
    where id = v_invite.id;

  return query select p.id, p.name from properties p where p.id = v_invite.property_id;
end;
$$;

revoke all on function redeem_invite(uuid) from public;
grant execute on function redeem_invite(uuid) to authenticated;

-- ============ get_invite_preview RPC (unauthenticated lookup) ============

create or replace function get_invite_preview(p_token uuid)
returns table (property_name text, valid boolean)
language sql security definer
set search_path = public
as $$
  select p.name, (i.status = 'pending' and i.expires_at > now())
  from property_invites i
  join properties p on p.id = i.property_id
  where i.token = p_token;
$$;

revoke all on function get_invite_preview(uuid) from public;
grant execute on function get_invite_preview(uuid) to anon, authenticated;

-- ============ Storage bucket (the live bug fix) ============

insert into storage.buckets (id, name, public)
values ('meter-photos', 'meter-photos', true)
on conflict (id) do nothing;

drop policy if exists "public read meter-photos" on storage.objects;
create policy "public read meter-photos" on storage.objects
  for select using (bucket_id = 'meter-photos');

drop policy if exists "public upload meter-photos" on storage.objects;
drop policy if exists "admin upload meter-photos" on storage.objects;
create policy "admin upload meter-photos" on storage.objects
  for insert with check (bucket_id = 'meter-photos' and is_admin());

-- ============ After running this file ============
-- 1. Sign up Wayne's account through the app's /login page (or Supabase Auth UI).
-- 2. Promote him to admin:
--      update profiles set role = 'admin' where id =
--        (select id from auth.users where email = 'wayne@example.com');
