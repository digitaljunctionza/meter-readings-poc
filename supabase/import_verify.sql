-- ============================================================
-- Post-import verification — READ ONLY
-- ============================================================
-- One query, so the Supabase SQL editor shows every section at once.
-- Run after import_readings.sql.
--
-- Expected:
--   A. 7 months, Feb-Aug 2026, 776 readings total
--   B. 114 meters: 106 unit + 8 communal (was 125 meters incl. 18 communal)
--   C. exactly 8 communal meters, one per physical meter, no spelling variants
--   D. the units with no meter (harmless — no readings in the sheet)
--   E. flags: 591 ok / 127 above_2x_avg / 33 below_prev / 25 possible_partial

with months as (
  select 'A. readings by month' as section, to_char(mr.captured_at, 'YYYY-MM') as item,
         count(distinct mr.meter_id)::text || ' meters' as detail,
         count(*)::text as n
  from meter_readings mr
  join meters m on m.id = mr.meter_id
  join properties p on p.id = m.property_id and p.name = 'Tarragon Place'
  group by 1, 2
),
total as (
  select 'A. readings by month', 'TOTAL', '', count(*)::text
  from meter_readings mr
  join meters m on m.id = mr.meter_id
  join properties p on p.id = m.property_id and p.name = 'Tarragon Place'
),
metercount as (
  select 'B. meter counts', m.service,
         case when m.is_communal then 'communal' else 'per unit' end,
         count(*)::text
  from meters m
  join properties p on p.id = m.property_id and p.name = 'Tarragon Place'
  group by 1, 2, 3
),
communal as (
  select 'C. communal meters', m.label, m.service,
         count(mr.id)::text || ' readings'
  from meters m
  join properties p on p.id = m.property_id and p.name = 'Tarragon Place'
  left join meter_readings mr on mr.meter_id = m.id
  where m.is_communal
  group by 1, 2, 3
),
orphanunits as (
  select 'D. units with no meter', u.unit_number, 'no readings in the sheet', ''
  from units u
  join properties p on p.id = u.property_id and p.name = 'Tarragon Place'
  where not exists (select 1 from meters m where m.unit_id = u.id)
),
flags as (
  select 'E. flags', mr.flag_status, '', count(*)::text
  from meter_readings mr
  join meters m on m.id = mr.meter_id
  join properties p on p.id = m.property_id and p.name = 'Tarragon Place'
  group by 1, 2
),
review as (
  -- What Wayne will see in the review queue: everything flagged and unreviewed.
  select 'F. review queue', mr.flag_status, 'awaiting review', count(*)::text
  from meter_readings mr
  join meters m on m.id = mr.meter_id
  join properties p on p.id = m.property_id and p.name = 'Tarragon Place'
  where mr.flag_status <> 'ok' and mr.reviewed_at is null
  group by 1, 2, 3
)
select * from (
  select * from months
  union all select * from total
  union all select * from metercount
  union all select * from communal
  union all select * from orphanunits
  union all select * from flags
  union all select * from review
) report
order by section, item;
