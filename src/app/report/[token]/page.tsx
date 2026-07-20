import { notFound } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { buildReportRows } from "@/lib/report";
import { ReadingsTable } from "@/components/ReadingsTable";
import { ReportControls } from "@/components/ReportControls";
import type { Property } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function OwnerReportPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const { token } = await params;
  const { from, to } = await searchParams;

  const { data: propertyRow } = await supabase
    .from("properties")
    .select("*")
    .eq("owner_share_token", token)
    .single();

  const property = propertyRow as Property | null;
  if (!property) {
    notFound();
  }

  const rows = await buildReportRows(property.id, { from, to });

  return (
    <main className="mx-auto flex max-w-5xl flex-col gap-6 bg-white px-4 py-6">
      <div className="rounded-2xl bg-accent px-4 py-4">
        <h1 className="text-lg font-bold text-white">{property.name}</h1>
        {property.address && <p className="text-sm text-white/80">{property.address}</p>}
      </div>
      <p className="text-sm text-gray-600">Meter reading history and consumption report.</p>
      <ReportControls />
      <ReadingsTable rows={rows} />
    </main>
  );
}
