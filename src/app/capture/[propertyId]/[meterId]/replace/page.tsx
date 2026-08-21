import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/auth";
import { MeterReplacementForm } from "@/components/MeterReplacementForm";
import type { Meter, MeterReading, Property, Unit } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function MeterReplacementPage({
  params,
}: {
  params: Promise<{ propertyId: string; meterId: string }>;
}) {
  const profile = await getProfile();
  if (!profile) redirect("/login?next=/capture");
  if (profile.role !== "admin") redirect("/client");

  const { propertyId, meterId } = await params;
  const supabase = await createClient();

  const [{ data: propertyRow }, { data: meterRow }] = await Promise.all([
    supabase.from("properties").select("*").eq("id", propertyId).single(),
    supabase.from("meters").select("*").eq("id", meterId).eq("property_id", propertyId).single(),
  ]);
  if (!propertyRow || !meterRow) notFound();
  const property = propertyRow as Property;
  const meter = meterRow as Meter;
  if (meter.retired_at) notFound();

  const [{ data: unitRow }, { data: lastReadingRow }] = await Promise.all([
    meter.unit_id ? supabase.from("units").select("*").eq("id", meter.unit_id).single() : Promise.resolve({ data: null }),
    supabase
      .from("meter_readings")
      .select("*")
      .eq("meter_id", meterId)
      .order("captured_at", { ascending: false })
      .limit(1),
  ]);

  const unit = unitRow as Unit | null;
  const lastReading = (lastReadingRow as unknown as MeterReading[] | null)?.[0] ?? null;

  return (
    <MeterReplacementForm
      propertyId={propertyId}
      propertyName={property.name}
      oldMeterId={meter.id}
      unitNumber={unit?.unit_number ?? null}
      service={meter.service}
      oldSerial={meter.serial}
      lastReadingValue={lastReading?.reading_value ?? null}
      lastReadingDate={lastReading?.captured_at ?? null}
    />
  );
}
