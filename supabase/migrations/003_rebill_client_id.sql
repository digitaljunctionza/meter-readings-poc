-- ============================================================
-- 003: Rebill client mapping
-- ============================================================
-- Run in the Supabase SQL editor AFTER 002_clients_and_meters.sql.
--
-- Stores the Rebill client ID against our client record, so quote
-- creation can reference an existing Rebill client instead of guessing
-- at a lookup/create flow. Set manually per client in the admin UI —
-- copy the ID from the client's page in Rebill.

alter table clients
  add column if not exists rebill_client_id text;

-- ------------------------------------------------------------
-- Verification
-- ------------------------------------------------------------
select id, name, rebill_client_id from clients order by name;
