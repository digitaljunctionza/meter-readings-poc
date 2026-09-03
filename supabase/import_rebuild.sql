-- ============================================================
-- DESTRUCTIVE — clears Tarragon Place so import_readings.sql can rebuild it
-- ============================================================
-- READ THIS BEFORE RUNNING. It deletes data and cannot be undone from here.
--
-- WHY THIS EXISTS
--
-- The preflight showed the database already holds 673 readings for Feb-Jul
-- 2026, loaded from this same spreadsheet by the older import scripts before
-- dedupe and label normalisation existed. Two defects came with it:
--
--   1. Duplicate submissions were never collapsed. The sheet has the same
--      meter read twice in one month 17 times (double form submits); the
--      database kept both. That is why Feb holds 115 readings against the
--      sheet's 113, and Jul holds 118 against 111.
--
--   2. Communal meters fragmented. One physical main water meter is stored
--      as FOUR meters — "Big meter (Main Water Meter) - Water", "Big Meter
--      (Main Water Meter) - Water", "Main Water ameter - Water" and "Main
--      Water Meter - Water" — because the reader typed the name differently
--      each month and migration 002 backfilled one meter per spelling. The
--      same happened to the small water meter (4), the outside lights (3),
--      Public (3) and Spare (4). Eighteen meter rows for about eight
--      physical meters, so every usage figure for the common areas is split
--      across them and reads low.
--
-- Repairing that in place means merging 18 meters into 8, repointing their
-- readings, deleting 17 duplicate rows and recomputing flags. Rebuilding
-- from the spreadsheet does the same job in one pass and leaves no residue,
-- and the spreadsheet is the source of truth for every row either way.
--
-- WHAT IS DELETED
--   * all 673 meter_readings for Tarragon Place
--   * all 125 meters for Tarragon Place
--   * the 18 communal pseudo-units ("Main Water Meter", "Spare 2", ...)
--     that migration 002 needed before meters could stand alone
--
-- WHAT IS KEPT
--   * the client, its Rebill id (VPrt5Btpsq0e0sPk), and both properties
--   * the 53 numbered units (101-153)
--   * "Tarragon Two" and everything else, untouched
--
-- WHAT IS LOST THAT THE IMPORT DOES NOT RESTORE
--   * one reviewed flag. The preflight showed exactly 1 reading marked
--     reviewed (a below_prev). After the rebuild it returns to the review
--     queue and Wayne re-accepts it. Nothing else has been reviewed.
--
-- HOW TO RUN
--   1. Just run this file. Step 0 below snapshots everything it is about to
--      touch, so the backup and the delete cannot get out of step.
--   2. Run import_readings.sql immediately afterwards. Between the two the
--      app will show an empty property — do not stop halfway.
--
-- TO UNDO (before running import_readings.sql):
--   delete from meter_readings mr using meters m
--     where m.id = mr.meter_id and m.property_id in
--       (select id from properties where name = 'Tarragon Place');
--   delete from meters where property_id in
--     (select id from properties where name = 'Tarragon Place');
--   insert into units          select * from backup.units_pre_import;
--   insert into meters         select * from backup.meters_pre_import;
--   insert into meter_readings select * from backup.readings_pre_import;

-- ------------------------------------------------------------
-- 0. Snapshot
-- ------------------------------------------------------------
-- This project is on the free plan, which has no automated backups, so the
-- undo lives in the database itself.
--
-- The snapshot goes in a "backup" schema, NOT in public: Supabase exposes
-- every public table through PostgREST, and a copied table would arrive
-- with no RLS policies on it — readable by the anon key. Non-public schemas
-- are not exposed by default.
--
-- IF NOT EXISTS means re-running this file will not overwrite a good
-- snapshot with an already-emptied one.

create schema if not exists backup;

create table if not exists backup.readings_pre_import as
  select mr.* from meter_readings mr
  join meters m on m.id = mr.meter_id
  join properties p on p.id = m.property_id
  where p.name = 'Tarragon Place';

create table if not exists backup.meters_pre_import as
  select m.* from meters m
  join properties p on p.id = m.property_id
  where p.name = 'Tarragon Place';

create table if not exists backup.units_pre_import as
  select u.* from units u
  join properties p on p.id = u.property_id
  where p.name = 'Tarragon Place';

-- Refuse to delete anything if the snapshot did not capture the readings.
do $$
begin
  if (select count(*) from backup.readings_pre_import) = 0 then
    raise exception 'snapshot is empty — refusing to delete. Check backup.readings_pre_import.';
  end if;
  raise notice 'snapshot holds % readings, % meters, % units',
    (select count(*) from backup.readings_pre_import),
    (select count(*) from backup.meters_pre_import),
    (select count(*) from backup.units_pre_import);
end $$;

-- ------------------------------------------------------------
-- 1. Delete
-- ------------------------------------------------------------

do $$
declare
  tp uuid;
  n_readings int;
  n_meters int;
  n_units int;
  n_repl int;
begin
  select id into tp from properties where name = 'Tarragon Place'
  order by created_at limit 1;

  if tp is null then
    raise exception 'no property named Tarragon Place — nothing to rebuild';
  end if;

  -- meter_replacements has plain FKs to meters (no cascade), so it must go
  -- first or the meter delete fails. The preflight showed 0 retired meters,
  -- so this is expected to delete nothing.
  delete from meter_replacements where property_id = tp;
  get diagnostics n_repl = row_count;

  delete from meter_readings mr
  using meters m
  where m.id = mr.meter_id and m.property_id = tp;
  get diagnostics n_readings = row_count;

  delete from meters where property_id = tp;
  get diagnostics n_meters = row_count;

  -- Communal pseudo-units only: anything whose unit_number is not purely
  -- numeric. The 53 real units (101-153) stay, so the import reuses them
  -- rather than recreating them.
  delete from units
  where property_id = tp and unit_number !~ '^[0-9]+$';
  get diagnostics n_units = row_count;

  raise notice 'deleted % readings, % meters, % communal pseudo-units, % replacements',
    n_readings, n_meters, n_units, n_repl;
end $$;

-- Should print: 0 readings, 0 meters, and the 53 numbered units still there.
select 'after rebuild' as report,
       (select count(*) from meter_readings mr
          join meters m on m.id = mr.meter_id
          join properties p on p.id = m.property_id
         where p.name = 'Tarragon Place')                          as readings_left,
       (select count(*) from meters m
          join properties p on p.id = m.property_id
         where p.name = 'Tarragon Place')                          as meters_left,
       (select count(*) from units u
          join properties p on p.id = u.property_id
         where p.name = 'Tarragon Place')                          as units_kept,
       (select count(*) from clients)                              as clients_kept,
       (select count(*) from backup.readings_pre_import)           as snapshot_readings;
