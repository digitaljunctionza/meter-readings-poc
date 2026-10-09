"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createQuoteAction, type QuoteFormLineItem } from "@/app/admin/quotes/actions";
import { LineItemsEditor, emptyItem } from "@/components/LineItemsEditor";
import type { RebillItem } from "@/lib/rebill/client";

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function plus30DaysIso(): string {
  const d = new Date();
  d.setDate(d.getDate() + 30);
  return d.toISOString().slice(0, 10);
}

export function QuoteBuilderForm({
  clients,
  catalogItems = [],
}: {
  clients: { id: string; name: string; rebillClientId: string }[];
  catalogItems?: RebillItem[];
}) {
  const router = useRouter();
  const [rebillClientId, setRebillClientId] = useState(clients[0]?.rebillClientId ?? "");
  const [quoteDate, setQuoteDate] = useState(todayIso());
  const [expiryDate, setExpiryDate] = useState(plus30DaysIso());
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<QuoteFormLineItem[]>([emptyItem()]);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setResult(null);
    startTransition(async () => {
      try {
        const { id } = await createQuoteAction({ rebillClientId, quoteDate, expiryDate, notes, items });
        setResult({ ok: true, message: `Quote created in Rebill (id: ${id}).` });
        setItems([emptyItem()]);
        setNotes("");
        router.refresh();
      } catch (err) {
        setResult({ ok: false, message: err instanceof Error ? err.message : "Failed to create quote" });
      }
    });
  }

  if (clients.length === 0) {
    return (
      <p className="rounded-lg border border-border bg-white px-4 py-3 text-sm text-[#5d6c80]">
        Link at least one client to Rebill (above) before you can create a quote.
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 rounded-2xl border border-border p-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-semibold text-navy-900">Client</span>
          <select
            value={rebillClientId}
            onChange={(e) => setRebillClientId(e.target.value)}
            className="min-h-12 w-full rounded-xl border-[1.5px] border-border-strong bg-white px-3.5 py-2.5 text-base text-navy-900 outline-none focus:border-navy-700 focus:ring-2 focus:ring-navy-700/15"
          >
            {clients.map((c) => (
              <option key={c.id} value={c.rebillClientId}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-semibold text-navy-900">Quote date</span>
          <input
            type="date"
            required
            value={quoteDate}
            onChange={(e) => setQuoteDate(e.target.value)}
            className="min-h-12 w-full rounded-xl border-[1.5px] border-border-strong bg-white px-3.5 py-2.5 text-base text-navy-900 outline-none focus:border-navy-700 focus:ring-2 focus:ring-navy-700/15"
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-semibold text-navy-900">Expiry date</span>
          <input
            type="date"
            required
            value={expiryDate}
            onChange={(e) => setExpiryDate(e.target.value)}
            className="min-h-12 w-full rounded-xl border-[1.5px] border-border-strong bg-white px-3.5 py-2.5 text-base text-navy-900 outline-none focus:border-navy-700 focus:ring-2 focus:ring-navy-700/15"
          />
        </label>
      </div>

      <LineItemsEditor items={items} onChange={setItems} catalogItems={catalogItems} />

      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-semibold text-navy-900">Notes (optional)</span>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          className="min-h-12 w-full rounded-xl border-[1.5px] border-border-strong bg-white px-3.5 py-2.5 text-base text-navy-900 outline-none focus:border-navy-700 focus:ring-2 focus:ring-navy-700/15"
        />
      </label>

      <button
        type="submit"
        disabled={isPending}
        className="w-fit rounded-full bg-navy-700 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
      >
        {isPending ? "Creating…" : "Create quote in Rebill"}
      </button>

      {result && (
        <p
          className={`rounded-lg border-2 px-4 py-3 text-sm ${
            result.ok ? "border-green-200 bg-green-50 text-green-700" : "border-red-200 bg-red-50 text-red-700"
          }`}
        >
          {result.message}
        </p>
      )}
    </form>
  );
}
