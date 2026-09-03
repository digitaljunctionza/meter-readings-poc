// Parses the Google Sheets HTML export of the Tarragon Place meter-reading form
// into normalised JSON rows ready for import.
//
// Only the "Form responses 1" tab is read: the monthly tabs (Feb 2026 .. Aug 2026)
// are filtered views of that same tab, and "Meter Comp" is a derived comparison.
//
// Usage: node scripts/parse-sheet.mjs "<responses-dir>" [out.json]
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const SRC_DIR = process.argv[2];
const OUT = process.argv[3] ?? "readings.json";

if (!SRC_DIR) {
  console.error('Usage: node scripts/parse-sheet.mjs "<responses-dir>" [out.json]');
  process.exit(1);
}

// The reader writes communal meters free-hand into the unit field, so the same
// physical meter arrives under several spellings. Everything not matched here
// is treated as a numbered unit.
const COMMUNAL = [
  [/^(big )?(meter )?\(?main water ?a?meter\)?$/i, "Main Water Meter"],
  [/^big (meter|water meter)/i, "Main Water Meter"],
  [/^small(er)?( main)?( water)?( meter)?$/i, "Small Water Meter"],
  [/^outside lights?$/i, "Outside Lights"],
  [/^outside$/i, "Outside Lights"],
  [/^public( \d+)?$/i, (m) => `Public${m[1] ?? " 1"}`.replace(/\s+/g, " ")],
  [/^spare( \d+)?$/i, (m) => `Spare${m[1] ?? " 1"}`.replace(/\s+/g, " ")],
];

function normaliseLabel(rawUnit) {
  const unit = rawUnit.trim().replace(/\s+/g, " ");
  for (const [pattern, to] of COMMUNAL) {
    const m = unit.match(pattern);
    if (m) return { label: typeof to === "function" ? to(m) : to, is_communal: true };
  }
  // "118e" is unit 118 with the reader's "e" marker misplaced into the unit
  // column; the same marker shows up as a value suffix ("25335.10e").
  const numbered = unit.match(/^(\d+)\s*e?$/i);
  if (numbered) return { label: numbered[1], is_communal: false };
  return { label: unit, is_communal: true };
}

function parseTimestamp(ts) {
  // dd/mm/yyyy [hh:mm:ss], South African local time (UTC+2).
  const m = ts.trim().match(/^(\d{2})\/(\d{2})\/(\d{4})(?:\s+(\d{2}):(\d{2}):(\d{2}))?$/);
  if (!m) return null;
  const [, d, mo, y, hh = "12", mi = "00", ss = "00"] = m;
  return `${y}-${mo}-${d}T${hh}:${mi}:${ss}+02:00`;
}

function cells(tr) {
  return [...tr.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map((m) =>
    m[1]
      .replace(/<[^>]+>/g, "")
      .replace(/&amp;/g, "&")
      .replace(/&nbsp;/g, " ")
      .trim()
  );
}

const html = readFileSync(path.join(SRC_DIR, "Form responses 1.html"), "utf-8");
const trs = html.match(/<tr[\s\S]*?<\/tr>/g) ?? [];

const rows = [];
const skipped = [];

for (const tr of trs) {
  const c = cells(tr);
  if (c.length === 0) continue;
  const [ts, unit, value, photo, service] = c;
  if (ts === "Timestamp") continue; // header
  if (!ts && !unit && !value) continue; // spacer row

  const captured_at = parseTimestamp(ts);
  if (!captured_at) {
    skipped.push({ reason: "unparseable timestamp", row: c.slice(0, 5) });
    continue;
  }
  if (!unit || !value || !service) {
    skipped.push({ reason: "missing unit/value/service", row: c.slice(0, 5) });
    continue;
  }

  const { label, is_communal } = normaliseLabel(unit);
  rows.push({
    captured_at,
    label,
    is_communal,
    service: service.trim().toLowerCase(), // 'water' | 'electricity'
    raw_value: value.trim(), // kept verbatim: the app's flagging reads the raw shape
    photo_url: photo || null,
    source_unit: unit.trim(),
  });
}

rows.sort((a, b) => a.captured_at.localeCompare(b.captured_at));

// Dedupe: the same meter read twice in one calendar month. Identical values are
// a double form submission and collapse silently; differing values are a real
// conflict and are reported for a human to resolve.
const byKey = new Map();
const conflicts = [];
for (const r of rows) {
  const key = `${r.label}|${r.service}|${r.captured_at.slice(0, 7)}`;
  const existing = byKey.get(key);
  if (!existing) {
    byKey.set(key, r);
    continue;
  }
  if (existing.raw_value === r.raw_value) continue; // exact duplicate submission
  conflicts.push({ key, kept: existing.raw_value, dropped: r.raw_value });
}
const deduped = [...byKey.values()];

writeFileSync(OUT, JSON.stringify(deduped, null, 2));

const months = {};
const meters = new Set();
for (const r of deduped) {
  months[r.captured_at.slice(0, 7)] = (months[r.captured_at.slice(0, 7)] ?? 0) + 1;
  meters.add(`${r.label}|${r.service}`);
}

console.log(`parsed  ${rows.length} rows`);
console.log(`deduped ${deduped.length} rows -> ${OUT}`);
console.log(`meters  ${meters.size} (${[...meters].filter((m) => deduped.find((r) => `${r.label}|${r.service}` === m).is_communal).length} communal)`);
console.log("by month:", months);
if (skipped.length) {
  console.log(`\nskipped ${skipped.length}:`);
  for (const s of skipped) console.log(`  ${s.reason}: ${JSON.stringify(s.row)}`);
}
if (conflicts.length) {
  console.log(`\n${conflicts.length} same-month conflicts (kept the earlier submission):`);
  for (const c of conflicts) console.log(`  ${c.key}: kept ${c.kept}, dropped ${c.dropped}`);
}
const partial = deduped.filter((r) => !/^\d+(\.\d+)?$/.test(r.raw_value));
if (partial.length) {
  console.log(`\n${partial.length} values the app will flag possible_partial (review queue):`);
  for (const p of partial) console.log(`  ${p.captured_at.slice(0, 10)} ${p.label} ${p.service}: "${p.raw_value}"`);
}
