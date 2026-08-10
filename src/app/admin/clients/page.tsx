import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/auth";
import { AddClientForm } from "@/components/AddClientForm";
import { AddPropertyForm } from "@/components/AddPropertyForm";
import { MeterManager, type MeterRow } from "@/components/MeterManager";
import { InviteManager } from "@/components/InviteManager";
import { LogoutButton } from "@/components/LogoutButton";
import type { Client, Meter, Property, PropertyInvite, Unit } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function ClientsPage({
  searchParams,
}: {
  searchParams: Promise<{ client?: string }>;
}) {
  const profile = await getProfile();
  if (!profile) redirect("/login?next=/admin/clients");
  if (profile.role !== "admin") redirect("/client");

  const { client: selectedClientId } = await searchParams;

  const supabase = await createClient();
  const { data: clientRows } = await supabase.from("clients").select("*").order("name");
  const clients = (clientRows ?? []) as Client[];

  const activeClientId = selectedClientId || clients[0]?.id;
  const activeClient = clients.find((c) => c.id === activeClientId);

  const { data: propertyRows } = activeClientId
    ? await supabase
        .from("properties")
        .select("*")
        .eq("client_id", activeClientId)
        .order("name")
    : { data: [] };
  const properties = (propertyRows ?? []) as Property[];
  const propertyIds = properties.map((p) => p.id);

  const { data: meterRows } = propertyIds.length
    ? await supabase.from("meters").select("*").in("property_id", propertyIds)
    : { data: [] };
  const meters = (meterRows ?? []) as Meter[];

  const { data: unitRows } = propertyIds.length
    ? await supabase.from("units").select("*").in("property_id", propertyIds)
    : { data: [] };
  const unitById = new Map(((unitRows ?? []) as Unit[]).map((u) => [u.id, u]));

  // Reading counts per meter, so the UI can refuse to delete a meter with history.
  const { data: readingRows } = meters.length
    ? await supabase
        .from("meter_readings")
        .select("meter_id")
        .in(
          "meter_id",
          meters.map((m) => m.id)
        )
    : { data: [] };
  const readingCounts = new Map<string, number>();
  for (const r of (readingRows ?? []) as { meter_id: string }[]) {
    readingCounts.set(r.meter_id, (readingCounts.get(r.meter_id) ?? 0) + 1);
  }

  const metersByProperty = new Map<string, MeterRow[]>();
  for (const m of meters) {
    const row: MeterRow = {
      ...m,
      unit_number: m.unit_id ? (unitById.get(m.unit_id)?.unit_number ?? null) : null,
      reading_count: readingCounts.get(m.id) ?? 0,
    };
    const list = metersByProperty.get(m.property_id) ?? [];
    list.push(row);
    metersByProperty.set(m.property_id, list);
  }
  for (const list of metersByProperty.values()) {
    list.sort((a, b) => a.label.localeCompare(b.label, undefined, { numeric: true }));
  }

  const { data: inviteRows } = activeClientId
    ? await supabase
        .from("property_invites")
        .select("*")
        .eq("client_id", activeClientId)
        .order("created_at", { ascending: false })
    : { data: [] };
  const invites = (inviteRows ?? []) as PropertyInvite[];

  return (
    <main className="mx-auto flex w-full max-w-5xl min-w-0 flex-col gap-6 overflow-x-hidden bg-white px-4 py-6">
      <div className="flex min-w-0 items-center gap-3 rounded-2xl bg-accent px-3 py-3">
        <Link
          href="/admin"
          aria-label="Back to readings"
          className="flex h-10 w-10 shrink-0 items-center justify-center text-white"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
              d="M15 18l-6-6 6-6"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </Link>
        <h1 className="min-w-0 flex-1 truncate text-sm font-bold text-white">
          Clients &amp; meters
        </h1>
        <LogoutButton className="flex h-10 shrink-0 items-center rounded-full px-3 text-sm font-medium text-white/80" />
      </div>

      <div className="flex flex-wrap gap-2">
        {clients.map((c) => (
          <Link
            key={c.id}
            href={`/admin/clients?client=${c.id}`}
            className={`rounded-full border-2 px-3 py-1.5 text-sm font-medium ${
              c.id === activeClientId
                ? "border-accent bg-accent text-white"
                : "border-accent-light text-gray-700 hover:border-accent"
            }`}
          >
            {c.name}
          </Link>
        ))}
      </div>

      <AddClientForm />

      {activeClient && (
        <>
          <div className="flex flex-col gap-1">
            <h2 className="text-lg font-bold text-accent">{activeClient.name}</h2>
            {activeClient.contact_email && (
              <p className="text-sm text-gray-500">{activeClient.contact_email}</p>
            )}
          </div>

          <InviteManager clientId={activeClient.id} invites={invites} />

          <div className="flex flex-col gap-4">
            {properties.length === 0 && (
              <p className="text-sm text-gray-500">
                No properties for this client yet.
              </p>
            )}

            {properties.map((p) => (
              <div
                key={p.id}
                className="flex flex-col gap-3 rounded-2xl border-2 border-accent-light p-4"
              >
                <div className="flex flex-wrap items-baseline gap-2">
                  <h3 className="font-bold text-gray-900">{p.name}</h3>
                  {p.address && <span className="text-xs text-gray-500">{p.address}</span>}
                </div>
                <MeterManager
                  propertyId={p.id}
                  meters={metersByProperty.get(p.id) ?? []}
                />
              </div>
            ))}
          </div>

          <AddPropertyForm clientId={activeClient.id} />
        </>
      )}

      {clients.length === 0 && (
        <p className="text-sm text-gray-500">
          No clients yet. Add one to get started.
        </p>
      )}
    </main>
  );
}
