// SUPERSEDED — do not run. Written before migration 002 made `meters` a
// first-class table: this writes meter_readings with unit_id + service and no
// meter_id, which is now NOT NULL, so it fails outright. It also predates the
// admin-only RLS from migration 001, so the anon key it uses can no longer
// write at all. The current path is scripts/parse-sheet.mjs +
// scripts/generate-import-sql.mjs -> supabase/import_readings.sql.
import { readFileSync } from "node:fs";

const PROPERTY_ID = "f3438f7a-440f-4d7a-8e55-9d8efb86b694"; // Tarragon Place
const API_URL = "http://localhost:3000/api/readings";
const DATA_PATH = process.argv[2];

if (!DATA_PATH) {
  console.error("Usage: node import-historical.mjs <path-to-import_rows.json>");
  process.exit(1);
}

const rows = JSON.parse(readFileSync(DATA_PATH, "utf-8"));

let ok = 0;
let failed = 0;

for (const row of rows) {
  const res = await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      unit_number: row.unit_number,
      property_id: PROPERTY_ID,
      service: row.service,
      raw_value: row.raw_value,
      photo_url: row.photo_url,
      notes: null,
      captured_at: row.captured_at,
    }),
  });

  const json = await res.json();
  if (!res.ok) {
    failed++;
    console.error(`FAILED ${row.captured_at} unit=${row.unit_number} service=${row.service}: ${json.error}`);
  } else {
    ok++;
    if (json.reading.flag_status !== "ok") {
      console.log(
        `flagged ${json.reading.flag_status}: unit=${row.unit_number} service=${row.service} value=${row.raw_value}`
      );
    }
  }
}

console.log(`\nDone. ${ok} inserted, ${failed} failed.`);
