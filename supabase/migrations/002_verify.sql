-- ============================================================
-- Verification for 002_clients_and_meters.sql
-- Run AFTER the migration. Every check below should pass.
-- ============================================================

-- 1. No reading lost its link.
--    Expect: orphans = 0, and with_meter = readings_total.
select count(*)                        as readings_total,
       count(meter_id)                 as with_meter,
       count(*) - count(meter_id)      as orphans
from meter_readings;

-- 2. Every property is filed under a client. Expect: 0.
select count(*) as properties_without_client
from properties
where client_id is null;

-- 3. One meter per (unit, service) pair that had readings.
--    Expect: meters_created = distinct_pairs.
select (select count(*) from meters) as meters_created,
       (select count(*) from (select distinct unit_id, service from meter_readings) d)
         as distinct_pairs;

-- 4. Unit 101 should have exactly 2 meters (electricity + water),
--    with its readings split between them.
select m.label, m.service, m.is_communal, count(r.id) as readings
from meters m
join units u on u.id = m.unit_id
left join meter_readings r on r.meter_id = m.id
where u.unit_number = '101'
group by m.label, m.service, m.is_communal
order by m.service;

-- 5. Communal detection sanity check.
--    Every named (non-numeric) meter should show is_communal = true.
select u.unit_number, m.service, m.is_communal
from meters m
join units u on u.id = m.unit_id
where u.unit_number !~ '^[0-9]+$'
order by u.unit_number, m.service;

-- 6. Client access carried over from property_access.
select c.name, count(ca.user_id) as users_with_access
from clients c
left join client_access ca on ca.client_id = c.id
group by c.name;

-- 7. Roles renamed. Expect no 'owner' rows.
select role, count(*) from profiles group by role;
