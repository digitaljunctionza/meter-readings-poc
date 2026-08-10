import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";
import { computeFlagStatus } from "@/lib/flagging";
import type { Meter, MeterReading } from "@/lib/types";

export async function POST(req: NextRequest) {
  let adminUserId: string;
  try {
    const profile = await requireAdmin();
    adminUserId = profile.id;
  } catch {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  const supabase = await createClient();
  const body = await req.json();
  const { meter_id, raw_value, photo_url, notes, captured_at } = body as {
    meter_id: string;
    raw_value: string;
    photo_url: string | null;
    notes: string | null;
    captured_at?: string;
  };

  if (!meter_id || !raw_value) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const value = Number.parseFloat(raw_value);
  if (Number.isNaN(value)) {
    return NextResponse.json({ error: "Reading value is not numeric" }, { status: 400 });
  }

  const { data: meterRow, error: meterError } = await supabase
    .from("meters")
    .select("*")
    .eq("id", meter_id)
    .single();

  if (meterError || !meterRow) {
    return NextResponse.json({ error: "Meter not found" }, { status: 404 });
  }
  const meter = meterRow as Meter;

  // Filtering to <= this row's timestamp keeps backfilled historical rows
  // honest: "previous reading" must mean the reading before this one in time,
  // not just whatever happens to be most recently inserted.
  const cutoff = captured_at ?? new Date().toISOString();

  const { data: prevRows, error: prevError } = await supabase
    .from("meter_readings")
    .select("*")
    .eq("meter_id", meter_id)
    .lte("captured_at", cutoff)
    .order("captured_at", { ascending: false })
    .limit(1);

  if (prevError) {
    return NextResponse.json({ error: prevError.message }, { status: 500 });
  }

  const previousReadingForMeter = (prevRows?.[0] as MeterReading | undefined) ?? null;

  // Sibling meters of the same service on the same property, for the
  // cross-meter comparison in computeFlagStatus.
  const { data: siblingMeterRows, error: siblingError } = await supabase
    .from("meters")
    .select("id")
    .eq("property_id", meter.property_id)
    .eq("service", meter.service);

  if (siblingError) {
    return NextResponse.json({ error: siblingError.message }, { status: 500 });
  }
  const siblingMeterIds = (siblingMeterRows ?? []).map((m) => m.id as string);

  const { data: recentRows, error: recentError } = await supabase
    .from("meter_readings")
    .select("*")
    .in("meter_id", siblingMeterIds.length > 0 ? siblingMeterIds : [meter_id])
    .lte("captured_at", cutoff)
    .order("captured_at", { ascending: false })
    .limit(50);

  if (recentError) {
    return NextResponse.json({ error: recentError.message }, { status: 500 });
  }

  const flag_status = computeFlagStatus({
    rawValue: raw_value,
    value,
    service: meter.service,
    previousReadingForMeter,
    recentReadingsForServiceAcrossProperty: (recentRows ?? []) as MeterReading[],
  });

  const { data: inserted, error: insertError } = await supabase
    .from("meter_readings")
    .insert({
      meter_id,
      reading_value: value,
      photo_url,
      notes,
      flag_status,
      captured_by: adminUserId,
      // Legacy columns kept by migration 002 so a rollback to the previous
      // deploy still reads correctly. Migration 003 drops them.
      unit_id: meter.unit_id,
      service: meter.service,
      ...(captured_at ? { captured_at } : {}),
    })
    .select("*")
    .single();

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  return NextResponse.json({ reading: inserted });
}
