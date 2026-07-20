import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { computeFlagStatus } from "@/lib/flagging";
import type { MeterReading, Service } from "@/lib/types";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { unit_number, service, raw_value, photo_url, notes, property_id, captured_at } =
    body as {
      unit_number: string;
      property_id: string;
      service: Service;
      raw_value: string;
      photo_url: string | null;
      notes: string | null;
      captured_at?: string;
    };

  if (!unit_number || !property_id || !service || !raw_value) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const value = Number.parseFloat(raw_value);
  if (Number.isNaN(value)) {
    return NextResponse.json({ error: "Reading value is not numeric" }, { status: 400 });
  }

  const trimmedUnitNumber = unit_number.trim();

  const { data: existingUnit, error: existingUnitError } = await supabase
    .from("units")
    .select("id")
    .eq("property_id", property_id)
    .eq("unit_number", trimmedUnitNumber)
    .maybeSingle();

  if (existingUnitError) {
    return NextResponse.json({ error: existingUnitError.message }, { status: 500 });
  }

  let unit_id = existingUnit?.id as string | undefined;

  if (!unit_id) {
    const { data: newUnit, error: newUnitError } = await supabase
      .from("units")
      .insert({ property_id, unit_number: trimmedUnitNumber })
      .select("id")
      .single();

    if (newUnitError) {
      return NextResponse.json({ error: newUnitError.message }, { status: 500 });
    }
    unit_id = newUnit.id as string;
  }

  // Filtering to <= this row's timestamp keeps backfilled historical rows honest:
  // "previous reading" must mean the reading before this one in time, not just
  // whatever happens to be most recently inserted.
  const cutoff = captured_at ?? new Date().toISOString();

  const { data: prevRows, error: prevError } = await supabase
    .from("meter_readings")
    .select("*")
    .eq("unit_id", unit_id)
    .eq("service", service)
    .lte("captured_at", cutoff)
    .order("captured_at", { ascending: false })
    .limit(1);

  if (prevError) {
    return NextResponse.json({ error: prevError.message }, { status: 500 });
  }

  const previousReadingForUnit = (prevRows?.[0] as MeterReading | undefined) ?? null;

  const { data: unitRows, error: unitError } = await supabase
    .from("units")
    .select("id")
    .eq("property_id", property_id);

  if (unitError) {
    return NextResponse.json({ error: unitError.message }, { status: 500 });
  }
  const unitIds = (unitRows ?? []).map((u) => u.id as string);

  const { data: recentRows, error: recentError } = await supabase
    .from("meter_readings")
    .select("*")
    .in("unit_id", unitIds.length > 0 ? unitIds : [unit_id])
    .eq("service", service)
    .lte("captured_at", cutoff)
    .order("captured_at", { ascending: false })
    .limit(50);

  if (recentError) {
    return NextResponse.json({ error: recentError.message }, { status: 500 });
  }

  const flag_status = computeFlagStatus({
    rawValue: raw_value,
    value,
    service,
    previousReadingForUnit,
    recentReadingsForServiceAcrossProperty: (recentRows ?? []) as MeterReading[],
  });

  const { data: inserted, error: insertError } = await supabase
    .from("meter_readings")
    .insert({
      unit_id,
      service,
      reading_value: value,
      photo_url,
      notes,
      flag_status,
      ...(captured_at ? { captured_at } : {}),
    })
    .select("*")
    .single();

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  return NextResponse.json({ reading: inserted });
}
