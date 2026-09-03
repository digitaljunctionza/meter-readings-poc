// SUPERSEDED — do not run. Written before migration 002 made `meters` a
// first-class table: this writes meter_readings with unit_id + service and no
// meter_id, which is now NOT NULL, so it fails outright. It also predates the
// admin-only RLS from migration 001, so the anon key it uses can no longer
// write at all. The current path is scripts/parse-sheet.mjs +
// scripts/generate-import-sql.mjs -> supabase/import_readings.sql.
// Direct-to-Supabase historical import, bypassing the app's /api/readings route.
// Used for backfilling Feb-May 2026 while the DB still has the pre-auth-migration
// permissive RLS policies (this script talks to Supabase directly with the anon
// key already present in .env.local, using the same flag logic as the app).
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

const envPath = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", ".env.local");
const envText = readFileSync(envPath, "utf-8");
const env = {};
for (const line of envText.split("\n")) {
  const match = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
  if (match) env[match[1]] = match[2].trim();
}

const PROPERTY_ID = "f3438f7a-440f-4d7a-8e55-9d8efb86b694"; // Tarragon Place
const DATA_PATH = process.argv[2];

if (!DATA_PATH) {
  console.error("Usage: node import-historical-direct.mjs <path-to-rows.json>");
  process.exit(1);
}

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

const VALID_READING_PATTERN = /^\d+(\.\d+)?$/;
function looksLikePartialEntry(raw) {
  return !VALID_READING_PATTERN.test(raw.trim());
}

function computeFlagStatus({ rawValue, value, previousReadingForUnit, recentReadings }) {
  if (looksLikePartialEntry(rawValue)) return "possible_partial";
  if (previousReadingForUnit && value < previousReadingForUnit.reading_value) return "below_prev";

  const others = recentReadings.filter((r) => r.unit_id !== previousReadingForUnit?.unit_id);
  if (others.length > 0) {
    const avg = others.reduce((sum, r) => sum + r.reading_value, 0) / others.length;
    if (avg > 0 && value > avg * 2) return "above_2x_avg";
  }
  return "ok";
}

const rows = JSON.parse(readFileSync(DATA_PATH, "utf-8"));

let ok = 0;
let failed = 0;

for (const row of rows) {
  const unit_number = row.unit_number.trim();
  const value = Number.parseFloat(row.raw_value);
  if (Number.isNaN(value)) {
    failed++;
    console.error(`SKIP non-numeric: ${row.captured_at} unit=${unit_number} value=${row.raw_value}`);
    continue;
  }

  const { data: existingUnit, error: existingUnitError } = await supabase
    .from("units")
    .select("id")
    .eq("property_id", PROPERTY_ID)
    .eq("unit_number", unit_number)
    .maybeSingle();

  if (existingUnitError) {
    failed++;
    console.error(`FAILED unit lookup ${unit_number}: ${existingUnitError.message}`);
    continue;
  }

  let unit_id = existingUnit?.id;
  if (!unit_id) {
    const { data: newUnit, error: newUnitError } = await supabase
      .from("units")
      .insert({ property_id: PROPERTY_ID, unit_number })
      .select("id")
      .single();
    if (newUnitError) {
      failed++;
      console.error(`FAILED unit create ${unit_number}: ${newUnitError.message}`);
      continue;
    }
    unit_id = newUnit.id;
  }

  const cutoff = row.captured_at;

  const { data: prevRows } = await supabase
    .from("meter_readings")
    .select("*")
    .eq("unit_id", unit_id)
    .eq("service", row.service)
    .lte("captured_at", cutoff)
    .order("captured_at", { ascending: false })
    .limit(1);
  const previousReadingForUnit = prevRows?.[0] ?? null;

  const { data: unitRows } = await supabase
    .from("units")
    .select("id")
    .eq("property_id", PROPERTY_ID);
  const unitIds = (unitRows ?? []).map((u) => u.id);

  const { data: recentRows } = await supabase
    .from("meter_readings")
    .select("*")
    .in("unit_id", unitIds.length > 0 ? unitIds : [unit_id])
    .eq("service", row.service)
    .lte("captured_at", cutoff)
    .order("captured_at", { ascending: false })
    .limit(50);

  const flag_status = computeFlagStatus({
    rawValue: row.raw_value,
    value,
    previousReadingForUnit,
    recentReadings: recentRows ?? [],
  });

  const { error: insertError } = await supabase.from("meter_readings").insert({
    unit_id,
    service: row.service,
    reading_value: value,
    photo_url: row.photo_url,
    notes: null,
    flag_status,
    captured_at: row.captured_at,
  });

  if (insertError) {
    failed++;
    console.error(`FAILED insert ${row.captured_at} unit=${unit_number}: ${insertError.message}`);
  } else {
    ok++;
    if (flag_status !== "ok") {
      console.log(`flagged ${flag_status}: unit=${unit_number} service=${row.service} value=${row.raw_value}`);
    }
  }
}

console.log(`\nDone. ${ok} inserted, ${failed} failed.`);
