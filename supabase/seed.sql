-- Seed a test property with a few units, for POC testing.
-- Run after schema.sql in the Supabase SQL editor.

with new_property as (
  insert into properties (name, address)
  values ('Tarragon Place', '123 Tarragon St')
  returning id
)
insert into units (property_id, unit_number)
select new_property.id, unit_number
from new_property, (values ('101'), ('102'), ('103'), ('104'), ('105')) as u(unit_number);

-- After running, find the owner report link with:
-- select name, owner_share_token from properties;
