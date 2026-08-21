"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createQuoteAction, type QuoteFormLineItem } from "@/app/admin/quotes/actions";

function emptyItem(): QuoteFormLineItem {
  return { name: "", description: "", quantity: "1", unitPrice: "", vatRate: "15" };
}

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
}: {
  clients: { id: string; name: string; rebillClientId: string }[];
}) {
  const router = useRouter();
  const [rebillClientId, setRebillClientId] = useState(clients[0]?.rebillClientId ?? "");
  const [quoteDate, setQuoteDate] = useState(todayIso());
  const [expiryDate, setExpiryDate] = useState(plus30DaysIso());
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<QuoteFormLineItem[]>([emptyItem()]);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  function updateItem(index: number, patch: Partial<QuoteFormLineItem>) {
    setItems((prev) => prev.map((it, i) => (i === index ? { ...it, ...patch } : it)));
  }

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
      <p className="rounded-lg border-2 border-accent-light bg-white px-4 py-3 text-sm text-gray-500">
        Link at least one client to Rebill (above) before you can create a quote.
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 rounded-2xl border-2 border-accent-light p-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-bold text-accent">Client</span>
          <select
            value={rebillClientId}
            onChange={(e) => setRebillClientId(e.target.value)}
            className="w-full rounded-lg border-2 border-accent-light bg-white px-3 py-2 text-sm outline-none focus:border-accent"
          >
            {clients.map((c) => (
              <option key={c.id} value={c.rebillClientId}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-bold text-accent">Quote date</span>
          <input
            type="date"
            required
            value={quoteDate}
            onChange={(e) => setQuoteDate(e.target.value)}
            className="w-full rounded-lg border-2 border-accent-light bg-white px-3 py-2 text-sm outline-none focus:border-accent"
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-bold text-accent">Expiry date</span>
          <input
            type="date"
            required
            value={expiryDate}
            onChange={(e) => setExpiryDate(e.target.value)}
            className="w-full rounded-lg border-2 border-accent-light bg-white px-3 py-2 text-sm outline-none focus:border-accent"
          />
        </label>
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-xs font-bold text-accent">Line items</span>
        {items.map((item, i) => (
          <div key={i} className="grid grid-cols-1 gap-2 rounded-lg border-2 border-accent-light p-3 sm:grid-cols-12">
            <input
              type="text"
              placeholder="Item name"
              required
              value={item.name}
              onChange={(e) => updateItem(i, { name: e.target.value })}
              className="rounded-lg border-2 border-accent-light bg-white px-2.5 py-2 text-sm outline-none focus:border-accent sm:col-span-4"
            />
            <input
              type="text"
              placeholder="Description (optional)"
              value={item.description}
              onChange={(e) => updateItem(i, { description: e.target.value })}
              className="rounded-lg border-2 border-accent-light bg-white px-2.5 py-2 text-sm outline-none focus:border-accent sm:col-span-3"
            />
            <input
              type="number"
              min="0"
              step="1"
              placeholder="Qty"
              value={item.quantity}
              onChange={(e) => updateItem(i, { quantity: e.target.value })}
              className="rounded-lg border-2 border-accent-light bg-white px-2.5 py-2 text-sm outline-none focus:border-accent sm:col-span-2"
            />
            <input
              type="number"
              min="0"
              step="0.01"
              placeholder="Unit price (R)"
              value={item.unitPrice}
              onChange={(e) => updateItem(i, { unitPrice: e.target.value })}
              className="rounded-lg border-2 border-accent-light bg-white px-2.5 py-2 text-sm outline-none focus:border-accent sm:col-span-2"
            />
            <div className="flex items-center gap-1 sm:col-span-1">
              <input
                type="number"
                min="0"
                step="0.1"
                value={item.vatRate}
                onChange={(e) => updateItem(i, { vatRate: e.target.value })}
                className="w-full rounded-lg border-2 border-accent-light bg-white px-2 py-2 text-sm outline-none focus:border-accent"
              />
              <span className="text-xs text-gray-400">%</span>
            </div>
            {items.length > 1 && (
              <button
                type="button"
                onClick={() => setItems((prev) => prev.filter((_, idx) => idx !== i))}
                className="text-left text-xs text-red-600 underline sm:col-span-12"
              >
                Remove item
              </button>
            )}
          </div>
        ))}
        <button
          type="button"
          onClick={() => setItems((prev) => [...prev, emptyItem()])}
          className="w-fit rounded-full border-2 border-accent-light px-3 py-1.5 text-xs font-medium text-gray-700 hover:border-accent"
        >
          + Add item
        </button>
      </div>

      <label className="flex flex-col gap-1.5">
        <span className="text-xs font-bold text-accent">Notes (optional)</span>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          className="w-full rounded-lg border-2 border-accent-light bg-white px-3 py-2 text-sm outline-none focus:border-accent"
        />
      </label>

      <button
        type="submit"
        disabled={isPending}
        className="w-fit rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
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
