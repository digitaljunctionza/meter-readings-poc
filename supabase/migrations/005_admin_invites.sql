-- ============================================================
-- 005: Admin invites
-- ============================================================
-- Run in the Supabase SQL editor AFTER 004_review_and_replacement.sql.
--
-- Lets an existing admin invite a new admin without ever touching SQL —
-- mirrors the existing property_invites / redeem_invite pattern used for
-- client invites, just promoting the redeeming user to 'admin' instead of
-- granting client access.

create table if not exists admin_invites (
  id uuid primary key default gen_random_uuid(),
  token uuid not null default gen_random_uuid(),
  email text,
  created_by uuid not null references auth.users (id),
  status text not null default 'pending' check (status in ('pending', 'used', 'revoked')),
  used_by uuid references auth.users (id),
  used_at timestamptz,
  expires_at timestamptz not null default (now() + interval '14 days'),
  created_at timestamptz not null default now()
);
create unique index if not exists admin_invites_token_idx on admin_invites (token);
alter table admin_invites enable row level security;

drop policy if exists "admin full access admin_invites" on admin_invites;
create policy "admin full access admin_invites" on admin_invites
  for all using (is_admin()) with check (is_admin());

-- ------------------------------------------------------------
-- redeem_admin_invite() — promotes the calling (already-authenticated)
-- user to admin. Deliberately does NOT create the auth user itself (no
-- service-role key available to this app) — the client signs up normally
-- via Supabase Auth first, then calls this to upgrade their own profile.
-- ------------------------------------------------------------

create or replace function redeem_admin_invite(p_token uuid)
returns void
language plpgsql security definer
set search_path = public
as $$
declare
  v_invite admin_invites%rowtype;
begin
  select * into v_invite from admin_invites
    where token = p_token and status = 'pending' and expires_at > now()
    for update;

  if not found then
    raise exception 'invalid_or_expired_invite';
  end if;

  update profiles set role = 'admin' where id = auth.uid();

  update admin_invites
    set status = 'used', used_by = auth.uid(), used_at = now()
    where id = v_invite.id;
end;
$$;

revoke all on function redeem_admin_invite(uuid) from public;
grant execute on function redeem_admin_invite(uuid) to authenticated;

-- ------------------------------------------------------------
-- get_admin_invite_preview() — unauthenticated validity check, same
-- shape as get_invite_preview() for client invites.
-- ------------------------------------------------------------

create or replace function get_admin_invite_preview(p_token uuid)
returns table (valid boolean)
language sql security definer
set search_path = public
as $$
  select (status = 'pending' and expires_at > now())
  from admin_invites
  where token = p_token;
$$;

revoke all on function get_admin_invite_preview(uuid) from public;
grant execute on function get_admin_invite_preview(uuid) to anon, authenticated;

-- ------------------------------------------------------------
-- Verification
-- ------------------------------------------------------------
select id, email, status, created_at, expires_at from admin_invites order by created_at desc;
