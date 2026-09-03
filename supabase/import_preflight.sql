-- ============================================================
-- Preflight for import_readings.sql — READ ONLY, changes nothing
-- ============================================================
-- ONE query, so the Supabase SQL editor shows every section at once.
-- (The editor only renders the last result set, so this cannot be split
-- into separate statements.) Run it, then read the sections in order.
--
-- What you are checking for:
--
--   A. migrations — all four must say true. If any says false, stop and run
--      that migration before importing.
--
--   B/C. clients + properties — a property showing "(ORPHANED)" has no
--      client; the import adopts it into "Tarragon Place" automatically.
--      Two properties with the same name would be a problem: the import
--      raises an exception rather than guessing.
--
--   E. communal meters — THE ONE THING THAT NEEDS YOUR EYES.
--      Unit meters are matched through their unit, so their label does not
--      matter. Communal meters have no unit and are matched on label alone,
--      so if the database already holds the main water meter as "Big Meter"
--      and the import calls it "Main Water Meter", you get two meters for
--      one physical meter and the usage maths splits in half.
--
--      Labels the import will use:
--        Main Water Meter (water)     <- "Big Meter (Main Water Meter)",
--                                        "Big meter (Main Water Meter)",
--                                        "Main Water Meter", "Main Water ameter"
--        Small Water Meter (water)    <- "Small Meter", "Small meter",
--                                        "Small water meter", "Smaller Water Meter",
--                                        "Small Main Water Meter"
--        Outside Lights (electricity) <- "Outside Lights", "Outside lights", "Outside"
--        Public 1, Public 2 (electricity)   <- bare "Public" folds into "Public 1"
--        Spare 1 .. Spare 4 (electricity)   <- bare "Spare" folds into "Spare 1"
--
--      "Outside" -> "Outside Lights" is my assumption: three readings under
--      the bare name, June-July, continuing the same value series (6332.7,
--      6370.4) as the "Outside Lights" rows. If it is a separate meter, say
--      so and I will split it back out.
--
--   G. readings by month — any month already listed is one the import skips
--      for that meter, so existing history is topped up, never duplicated.

with mig as (
  select 'A. migrations' as section, k as item, v as detail, '' as n
  from (values
    ('002 meters table',
      (to_regclass('public.meters') is not null)::text),
    ('003 clients.rebill_client_id',
      (exists (select 1 from information_schema.columns
        where table_name = 'clients' and column_name = 'rebill_client_id'))::text),
    ('004 meter_readings.reviewed_at',
      (exists (select 1 from information_schema.columns
        where table_name = 'meter_readings' and column_name = 'reviewed_at'))::text),
    ('005 admin_invites table',
      (to_regclass('public.admin_invites') is not null)::text)
  ) t(k, v)
),
cl as (
  select 'B. clients', c.name, coalesce(c.rebill_client_id, '(no rebill id)'), ''
  from clients c
),
prop as (
  select 'C. properties', p.name,
         coalesce(c.name, '(ORPHANED - no client)'),
         (select count(*)::text from units u where u.property_id = p.id) || ' units'
  from properties p left join clients c on c.id = p.client_id
),
unitcount as (
  select 'D. units', p.name, 'total units', count(*)::text
  from units u join properties p on p.id = u.property_id
  group by 1, 2, 3
),
communal as (
  select 'E. communal meters',
         m.label,
         m.service || case when m.retired_at is not null then ' (RETIRED)' else '' end,
         count(mr.id)::text || ' readings'
  from meters m
  left join meter_readings mr on mr.meter_id = m.id
  where m.is_communal = true or m.unit_id is null
  group by 1, 2, 3
),
unitmeters as (
  select 'F. unit meters', m.service, 'active / retired',
         count(*) filter (where m.retired_at is null)::text || ' / ' ||
         count(*) filter (where m.retired_at is not null)::text
  from meters m
  where m.unit_id is not null
  group by 1, 2, 3
),
months as (
  select 'G. readings by month', to_char(mr.captured_at, 'YYYY-MM'),
         count(distinct mr.meter_id)::text || ' meters',
         count(*)::text || ' readings'
  from meter_readings mr
  group by 1, 2
),
flags as (
  select 'H. flags', mr.flag_status,
         count(*) filter (where mr.reviewed_at is not null)::text || ' reviewed',
         count(*)::text || ' readings'
  from meter_readings mr
  group by 1, 2
),
orphans as (
  -- Readings whose meter is missing or whose property is not Tarragon Place.
  select 'I. other properties', coalesce(p.name, '(no property)'),
         'readings not on Tarragon Place',
         count(*)::text
  from meter_readings mr
  join meters m on m.id = mr.meter_id
  left join properties p on p.id = m.property_id
  where p.name is distinct from 'Tarragon Place'
  group by 1, 2, 3
)
select * from (
  select * from mig
  union all select * from cl
  union all select * from prop
  union all select * from unitcount
  union all select * from communal
  union all select * from unitmeters
  union all select * from months
  union all select * from flags
  union all select * from orphans
) report
order by section, item;
