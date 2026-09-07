import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/auth";
import { QuoteBuilderForm } from "@/components/QuoteBuilderForm";
import { QuoteList } from "@/components/QuoteList";
import { BottomNav } from "@/components/BottomNav";
import { isConfigured, listQuotes, type Quote } from "@/lib/rebill/client";
import type { Client } from "@/lib/types";

export const dynamic = "force-dynamic";
// Experiment: Vercel's Edge runtime routes through a different network path
// than the default Node serverless functions — worth testing whether that
// avoids the Cloudflare bot-challenge blocking Rebill API calls made from
// Node. Not a guaranteed fix; revert this line if it causes other issues
// or doesn't change the outcome.
export const runtime = "edge";

export default async function QuotesPage() {
  const profile = await getProfile();
  if (!profile) redirect("/login?next=/admin/quotes");
  if (profile.role !== "admin") redirect("/client");

  const supabase = await createClient();
  const { data: clientRows } = await supabase.from("clients").select("*").order("name");
  const clients = (clientRows ?? []) as Client[];
  const linkedCount = clients.filter((c) => c.rebill_client_id).length;
  const connected = isConfigured();

  let quotes: Quote[] = [];
  let quotesError: string | null = null;
  if (connected) {
    try {
      quotes = await listQuotes({ includeAccepted: true, includeConverted: true });
    } catch (err) {
      quotesError = err instanceof Error ? err.message : "Failed to load quotes from Rebill";
    }
  }

  const clientNameByRebillId = Object.fromEntries(
    clients.filter((c) => c.rebill_client_id).map((c) => [c.rebill_client_id as string, c.name])
  );

  return (
    <main className="mx-auto flex w-full max-w-3xl min-w-0 flex-col gap-6 overflow-x-hidden bg-white px-4 py-6 pb-32">
      <div className="flex min-w-0 items-center gap-3 rounded-2xl bg-navy-700 px-3 py-3">
        <Link
          href="/admin/more"
          aria-label="Back"
          className="flex h-10 w-10 shrink-0 items-center justify-center text-white"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </Link>
        <h1 className="min-w-0 flex-1 truncate text-sm font-bold text-white">Quotes</h1>
      </div>

      {!connected ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3.5 text-sm text-amber-900">
          <p className="font-semibold text-amber-900">Rebill isn&apos;t connected</p>
          <p className="mt-1 text-amber-800">
            Set <code className="font-mono text-xs">REBILL_API_KEY</code> and{" "}
            <code className="font-mono text-xs">REBILL_API_BASE</code> in your environment to enable quoting.
          </p>
        </div>
      ) : quotesError ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3.5 text-sm text-amber-900">
          <p className="font-semibold text-amber-900">Couldn&apos;t reach Rebill</p>
          <p className="mt-1 break-words text-amber-800">{quotesError}</p>
          <p className="mt-2 text-xs text-amber-700">
            The key and base URL are configured correctly, so this is a connectivity/reachability issue rather
            than a config one — try creating a quote below anyway, since the error may be specific to listing.
          </p>
        </div>
      ) : null}

      <div className="flex flex-col gap-3">
        <h2 className="text-sm font-bold text-accent">New quote</h2>
        <QuoteBuilderForm
          clients={clients
            .filter((c) => c.rebill_client_id)
            .map((c) => ({ id: c.id, name: c.name, rebillClientId: c.rebill_client_id as string }))}
        />
      </div>

      {connected && !quotesError && (
        <div className="flex flex-col gap-2">
          <h2 className="text-sm font-bold text-accent">Quotes ({quotes.length})</h2>
          <QuoteList quotes={quotes} clientNameByRebillId={clientNameByRebillId} />
          <p className="text-xs text-gray-500">Tap a quote to see its line items and edit them.</p>
        </div>
      )}

      <p className="text-xs text-gray-500">
        <span className="font-mono font-semibold text-gray-700">
          {linkedCount}/{clients.length}
        </span>{" "}
        client{clients.length === 1 ? "" : "s"} linked to Rebill. Manage links from{" "}
        <Link href="/admin/clients" className="text-accent underline">
          Clients &amp; meters
        </Link>
        .
      </p>

      <BottomNav />
    </main>
  );
}
