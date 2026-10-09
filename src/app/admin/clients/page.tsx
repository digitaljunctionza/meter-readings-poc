import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/auth";
import { formatDate } from "@/lib/date";
import { AddClientForm } from "@/components/AddClientForm";
import { AddPropertyForm } from "@/components/AddPropertyForm";
import { MeterManager, type MeterRow } from "@/components/MeterManager";
import { InviteManager } from "@/components/InviteManager";
import { RebillClientIdField } from "@/components/RebillClientIdField";
import { InlineDeleteControl } from "@/components/InlineDeleteControl";
import { EditPropertyButton } from "@/components/EditPropertyButton";
import { EditClientButton } from "@/components/EditClientButton";
import { BottomNav } from "@/components/BottomNav";
import { AdminPage } from "@/components/AdminPage";
import type { Client, Meter, Profile, Property, PropertyInvite, Unit } from "@/lib/types";

export const dynamic = "force-dynamic";
// Edge runtime avoids the Cloudflare bot-challenge that blocks Rebill API
// calls (the client search below) from Vercel's regular Node functions —
// see the same note on src/app/admin/quotes/page.tsx.
export const runtime = "edge";

type Tab = "properties" | "access" | "billing";
const TABS: { key: Tab; label: string }[] = [
  { key: "properties", label: "Properties" },
  { key: "access", label: "Portal access" },
  { key: "billing", label: "Billing" },
];

function initials(name: string): string {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w.charAt(0).toUpperCase())
      .join("") || "?"
  );
}

const CHIP = "rounded-full px-2.5 py-1 text-[13px] font-semibold";

export default async function ClientsPage({
  searchParams,
}: {
  searchParams: Promise<{ client?: string; property?: string; tab?: string }>;
}) {
  const profile = await getProfile();
  if (!profile) redirect("/login?next=/admin/clients");
  if (profile.role !== "admin") redirect("/client");

  const { client: selectedClientId, property: selectedPropertyId, tab: tabParam } = await searchParams;

  const supabase = await createClient();
  const [{ data: clientRows }, { data: allPropertyRows }, { data: allMeterRows }, { data: allInviteRows }] = await Promise.all([
    supabase.from("clients").select("*").order("name"),
    supabase.from("properties").select("*").order("name"),
    supabase.from("meters").select("id, property_id").is("retired_at", null),
    supabase.from("property_invites").select("client_id, status"),
  ]);
  const clients = (clientRows ?? []) as Client[];
  const allProperties = (allPropertyRows ?? []) as Property[];
  const meterCountByProperty = new Map<string, number>();
  for (const m of (allMeterRows ?? []) as Pick<Meter, "id" | "property_id">[]) {
    meterCountByProperty.set(m.property_id, (meterCountByProperty.get(m.property_id) ?? 0) + 1);
  }

  const activeClient = clients.find((c) => c.id === selectedClientId);

  // ---- List of clients -------------------------------------------------
  if (!activeClient) {
    const totalMeters = [...meterCountByProperty.values()].reduce((a, b) => a + b, 0);
    const pendingByClient = new Map<string, number>();
    for (const i of (allInviteRows ?? []) as Pick<PropertyInvite, "client_id" | "status">[]) {
      if (i.status === "pending") pendingByClient.set(i.client_id, (pendingByClient.get(i.client_id) ?? 0) + 1);
    }

    return (
      <AdminPage>
        <header className="flex flex-col gap-1 border-b border-border bg-surface px-5 pb-4 pt-[calc(env(safe-area-inset-top)+20px)] lg:mx-4 lg:rounded-2xl lg:border lg:pt-5">
          <div className="flex items-center justify-between gap-3">
            <h1 className="text-2xl font-extrabold text-navy-900">Clients</h1>
            <AddClientForm />
          </div>
          <p className="text-sm text-[#5d6c80]">
            {clients.length} client{clients.length === 1 ? "" : "s"} · {allProperties.length} propert
            {allProperties.length === 1 ? "y" : "ies"} · {totalMeters} meters
          </p>
        </header>

        <div className="flex flex-1 flex-col gap-3 px-4 py-4">
          {clients.length === 0 && (
            <p className="rounded-2xl border border-border bg-surface px-4 py-4 text-[15px] text-text-body">
              No clients yet. Use <strong>Add client</strong> above to get started.
            </p>
          )}
          {clients.map((c) => {
            const props = allProperties.filter((p) => p.client_id === c.id);
            const pending = pendingByClient.get(c.id) ?? 0;
            return (
              <Link
                key={c.id}
                href={`/admin/clients?client=${c.id}`}
                className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-4 transition-colors hover:border-border-strong"
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#e8eef7] font-extrabold text-navy-700">
                    {initials(c.name)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-base font-bold text-navy-900">{c.name}</p>
                    <p className="truncate text-[13px] text-[#5d6c80]">{c.contact_email ?? "No contact email"}</p>
                  </div>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true" className="shrink-0 text-text-faint">
                    <path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {props.map((p) => (
                    <span key={p.id} className={`${CHIP} bg-app-bg text-navy-900`}>
                      {p.name} · {meterCountByProperty.get(p.id) ?? 0}
                    </span>
                  ))}
                  {props.length === 0 && <span className={`${CHIP} bg-app-bg text-[#5d6c80]`}>No properties yet</span>}
                  {c.rebill_client_id && <span className={`${CHIP} bg-[#e6f2df] font-bold text-[#2e6b1d]`}>Linked to Rebill</span>}
                  {pending > 0 && (
                    <span className={`${CHIP} bg-amber-50 font-bold text-[#7a5410]`}>
                      {pending} invite{pending === 1 ? "" : "s"} pending
                    </span>
                  )}
                </div>
              </Link>
            );
          })}
        </div>

        <BottomNav />
      </AdminPage>
    );
  }

  // ---- One client ------------------------------------------------------
  const tab: Tab = TABS.some((t) => t.key === tabParam) ? (tabParam as Tab) : "properties";
  const properties = allProperties.filter((p) => p.client_id === activeClient.id);
  const activeProperty = properties.find((p) => p.id === selectedPropertyId) ?? properties[0];
  const base = `/admin/clients?client=${activeClient.id}`;

  const [{ data: meterRows }, { data: unitRows }, { data: inviteRows }, { data: accessRows }] = await Promise.all([
    activeProperty ? supabase.from("meters").select("*").eq("property_id", activeProperty.id) : Promise.resolve({ data: [] }),
    activeProperty ? supabase.from("units").select("*").eq("property_id", activeProperty.id) : Promise.resolve({ data: [] }),
    supabase.from("property_invites").select("*").eq("client_id", activeClient.id).order("created_at", { ascending: false }),
    supabase.from("client_access").select("user_id, granted_at").eq("client_id", activeClient.id),
  ]);
  const meters = (meterRows ?? []) as Meter[];
  const unitById = new Map(((unitRows ?? []) as Unit[]).map((u) => [u.id, u]));
  const invites = (inviteRows ?? []) as PropertyInvite[];
  const access = (accessRows ?? []) as { user_id: string; granted_at: string }[];

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
  // Meters with readings can't be deleted, so the manager needs the counts.
  const meterList: MeterRow[] = meters
    .map((m) => ({
      ...m,
      unit_number: m.unit_id ? (unitById.get(m.unit_id)?.unit_number ?? null) : null,
      reading_count: readingCounts.get(m.id) ?? 0,
    }))
    .sort((a, b) => a.label.localeCompare(b.label, undefined, { numeric: true }));

  const { data: userRows } = access.length
    ? await supabase
        .from("profiles")
        .select("*")
        .in(
          "id",
          access.map((a) => a.user_id)
        )
    : { data: [] };
  const portalUsers = (userRows ?? []) as Profile[];

  return (
    <AdminPage>
      <header className="flex flex-col gap-3.5 border-b border-border bg-surface px-4 pt-[calc(env(safe-area-inset-top)+16px)] lg:mx-4 lg:rounded-2xl lg:border lg:pt-4">
        <div className="flex items-center gap-3">
          <Link
            href="/admin/clients"
            aria-label="Back to clients"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-border hover:bg-app-bg"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M15 5l-7 7 7 7" stroke="var(--navy-900)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Link>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-xl font-extrabold text-navy-900">{activeClient.name}</h1>
            <p className={`truncate text-[13px] ${activeClient.contact_email ? "text-[#5d6c80]" : "font-semibold text-[#7a5410]"}`}>
              {activeClient.contact_email ?? "No contact email, so reports can't be emailed yet"}
            </p>
          </div>
          <EditClientButton clientId={activeClient.id} currentName={activeClient.name} currentEmail={activeClient.contact_email} />
        </div>
        <nav aria-label="Client sections" className="-mb-px flex gap-6">
          {TABS.map((t) => (
            <Link
              key={t.key}
              href={`${base}&tab=${t.key}`}
              replace
              aria-current={tab === t.key ? "page" : undefined}
              className={`min-h-11 border-b-[3px] pb-2.5 pt-1 text-[15px] ${
                tab === t.key ? "border-navy-700 font-bold text-navy-900" : "border-transparent font-semibold text-[#5d6c80] hover:text-navy-900"
              }`}
            >
              {t.label}
            </Link>
          ))}
        </nav>
      </header>

      <div className="flex flex-1 flex-col gap-3 px-4 py-4">
        {tab === "properties" && (
          <>
            {properties.length > 1 && (
              <nav aria-label="Properties" className="flex flex-wrap gap-2">
                {properties.map((p) => (
                  <Link
                    key={p.id}
                    href={`${base}&tab=properties&property=${p.id}`}
                    replace
                    aria-current={p.id === activeProperty?.id ? "page" : undefined}
                    className={`min-h-11 rounded-full border-[1.5px] px-4 py-2.5 text-sm ${
                      p.id === activeProperty?.id
                        ? "border-navy-700 bg-navy-700 font-bold text-white"
                        : "border-border-strong bg-surface font-semibold text-navy-900 hover:border-navy-700"
                    }`}
                  >
                    {p.name} · {meterCountByProperty.get(p.id) ?? 0}
                  </Link>
                ))}
              </nav>
            )}

            {activeProperty ? (
              <section className="flex flex-col gap-4 rounded-2xl border border-border bg-surface p-4">
                <div className="flex items-start gap-3">
                  <div className="min-w-0 flex-1">
                    <h2 className="text-lg font-bold text-navy-900">{activeProperty.name}</h2>
                    <p className="mt-0.5 text-[13px] text-[#5d6c80]">
                      {[activeProperty.address, `${meterList.filter((m) => !m.retired_at).length} meters`].filter(Boolean).join(" · ")}
                    </p>
                  </div>
                  <EditPropertyButton
                    propertyId={activeProperty.id}
                    currentName={activeProperty.name}
                    currentAddress={activeProperty.address}
                  />
                </div>
                <MeterManager propertyId={activeProperty.id} meters={meterList} />
                <div className="border-t border-divider pt-3">
                  <InlineDeleteControl
                    kind="property"
                    id={activeProperty.id}
                    label="Delete this property"
                    blockedReason={
                      meterList.length > 0
                        ? `To delete this property, first remove its ${meterList.length} meter${meterList.length === 1 ? "" : "s"}.`
                        : null
                    }
                  />
                </div>
              </section>
            ) : (
              <p className="rounded-2xl border border-border bg-surface px-4 py-4 text-[15px] text-text-body">
                No properties for this client yet.
              </p>
            )}

            <AddPropertyForm clientId={activeClient.id} />
          </>
        )}

        {tab === "access" && (
          <>
            <p className="text-sm leading-relaxed text-text-body">
              People here can sign in and see only {activeClient.name}&apos;s readings and reports.
            </p>
            <section className="overflow-hidden rounded-2xl border border-border bg-surface">
              {portalUsers.map((u) => (
                <div key={u.id} className="flex items-center gap-3 border-b border-divider px-4 py-3.5 last:border-b-0">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#e8eef7] text-sm font-extrabold text-navy-700">
                    {initials(u.full_name ?? "?")}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[15px] font-bold text-navy-900">{u.full_name ?? "Unnamed user"}</p>
                    <p className="text-[13px] text-[#5d6c80]">
                      Has access since {formatDate(access.find((a) => a.user_id === u.id)?.granted_at ?? u.created_at)}
                    </p>
                  </div>
                </div>
              ))}
              {invites
                .filter((i) => i.status === "pending")
                .map((i) => (
                  <div key={i.id} className="flex items-center gap-3 border-b border-divider px-4 py-3.5 last:border-b-0">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-50 text-sm font-extrabold text-[#7a5410]">
                      ?
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[15px] font-bold text-navy-900">{i.email ?? "Invite link"}</p>
                      <p className="text-[13px] text-[#7a5410]">Pending · created {formatDate(i.created_at)}</p>
                    </div>
                  </div>
                ))}
              {portalUsers.length === 0 && !invites.some((i) => i.status === "pending") && (
                <p className="px-4 py-4 text-[15px] text-text-body">Nobody has portal access yet.</p>
              )}
            </section>
            <InviteManager clientId={activeClient.id} invites={invites} />
            <p className="text-[13px] text-[#5d6c80]">To revoke an invite, open the invite button above.</p>
          </>
        )}

        {tab === "billing" && (
          <>
            <section className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-4">
              <h2 className="text-base font-bold text-navy-900">Rebill</h2>
              <p className="text-sm leading-relaxed text-text-body">
                {activeClient.rebill_client_id
                  ? "Quotes for this client are created and sent from Rebill."
                  : "Link this client to Rebill so you can send them quotes."}
              </p>
              <RebillClientIdField
                clientId={activeClient.id}
                clientName={activeClient.name}
                contactEmail={activeClient.contact_email}
                rebillClientId={activeClient.rebill_client_id}
              />
              {activeClient.rebill_client_id && (
                <Link
                  href="/admin/quotes"
                  className="flex min-h-12 items-center justify-center rounded-xl border-[1.5px] border-border-strong text-[15px] font-bold text-navy-700 hover:bg-app-bg"
                >
                  View quotes
                </Link>
              )}
            </section>

            <section className="flex flex-col gap-2.5 rounded-2xl border border-[#f1c9c0] bg-surface p-4">
              <h2 className="text-base font-bold text-[#9a3412]">Danger zone</h2>
              <InlineDeleteControl
                kind="client"
                id={activeClient.id}
                label="Delete this client"
                blockedReason={
                  properties.length > 0
                    ? `To delete this client, first remove their ${properties.length} propert${properties.length === 1 ? "y" : "ies"} under Properties.`
                    : null
                }
              />
            </section>
          </>
        )}
      </div>

      <BottomNav />
    </AdminPage>
  );
}
