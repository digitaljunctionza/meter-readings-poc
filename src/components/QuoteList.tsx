"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { LineItemsEditor, emptyItem } from "@/components/LineItemsEditor";
import { updateQuoteItemsAction, type QuoteFormLineItem } from "@/app/admin/quotes/actions";
import { isEditableQuoteStatus, type Quote } from "@/lib/rebill/client";

const STATUS_STYLE: Record<Quote["status"], string> = {
  draft: "bg-gray-100 text-gray-600",
  sent: "bg-blue-50 text-blue-700",
  accepted: "bg-green-50 text-green-700",
  declined: "bg-red-50 text-red-700",
  expired: "bg-amber-50 text-amber-800",
  converted: "bg-accent-light text-accent",
};

function rand(cents: number): string {
  return (cents / 100).toFixed(2);
}

/** A quote's stored line item (cents, basis points) back into the form's
 * string fields (Rand, percent) so it can be edited in place. */
function toFormItem(it: Quote["items"][number]): QuoteFormLineItem {
  return {
    name: it.name,
    description: it.description ?? "",
    quantity: String(it.quantity),
    unitPrice: rand(it.unit_price),
    vatRate: it.vat_rate != null ? String(it.vat_rate / 100) : "15",
  };
}

export function QuoteList({
  quotes,
  clientNameByRebillId,
}: {
  quotes: Quote[];
  clientNameByRebillId: Record<string, string>;
}) {
  const router = useRouter();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftItems, setDraftItems] = useState<QuoteFormLineItem[]>([]);
  const [result, setResult] = useState<{ id: string; ok: boolean; message: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  function toggleExpand(id: string) {
    setExpandedId((prev) => (prev === id ? null : id));
    if (editingId && editingId !== id) setEditingId(null);
  }

  function startEdit(quote: Quote) {
    setEditingId(quote.id);
    setExpandedId(quote.id);
    setDraftItems(quote.items.length ? quote.items.map(toFormItem) : [emptyItem()]);
    setResult(null);
  }

  function save(quoteId: string) {
    setResult(null);
    startTransition(async () => {
      try {
        await updateQuoteItemsAction({ quoteId, items: draftItems });
        setResult({ id: quoteId, ok: true, message: "Line items updated in Rebill." });
        setEditingId(null);
        router.refresh();
      } catch (err) {
        setResult({
          id: quoteId,
          ok: false,
          message: err instanceof Error ? err.message : "Failed to update line items",
        });
      }
    });
  }

  if (quotes.length === 0) {
    return <p className="text-sm text-gray-500">No quotes yet.</p>;
  }

  return (
    <div className="flex flex-col gap-1.5">
      {quotes.map((q) => {
        const isExpanded = expandedId === q.id;
        const isEditing = editingId === q.id;
        const editable = isEditableQuoteStatus(q.status);
        return (
          <div key={q.id} className="rounded-lg border-2 border-accent-light text-sm">
            <button
              type="button"
              onClick={() => toggleExpand(q.id)}
              aria-expanded={isExpanded}
              className="flex w-full flex-wrap items-center gap-2 px-3 py-2 text-left"
            >
              <span className="font-mono text-xs font-semibold text-gray-800">{q.number}</span>
              <span className="min-w-0 flex-1 truncate text-gray-700">
                {clientNameByRebillId[q.client_id] ?? q.client_id}
              </span>
              <span className="font-mono text-xs text-gray-600">
                {q.currency} {rand(q.amount)}
              </span>
              <span
                className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium capitalize ${STATUS_STYLE[q.status]}`}
              >
                {q.status}
              </span>
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                aria-hidden="true"
                className={`shrink-0 text-gray-400 transition-transform ${isExpanded ? "rotate-180" : ""}`}
              >
                <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>

            {isExpanded && (
              <div className="flex flex-col gap-3 border-t-2 border-accent-light px-3 py-3">
                {isEditing ? (
                  <>
                    <LineItemsEditor items={draftItems} onChange={setDraftItems} disabled={isPending} />
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => save(q.id)}
                        disabled={isPending}
                        className="rounded-full bg-accent px-4 py-2 text-xs font-semibold text-white disabled:opacity-50"
                      >
                        {isPending ? "Saving…" : "Save line items"}
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingId(null)}
                        disabled={isPending}
                        className="rounded-full border-2 border-accent-light px-4 py-2 text-xs font-medium text-gray-700 disabled:opacity-50"
                      >
                        Cancel
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    {q.items.length === 0 ? (
                      <p className="text-xs text-gray-500">No line items on this quote.</p>
                    ) : (
                      <div className="flex flex-col gap-1">
                        {q.items.map((it, i) => (
                          <div key={i} className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                            <span className="min-w-0 flex-1 truncate font-medium text-gray-800">{it.name}</span>
                            <span className="font-mono text-xs text-gray-500">
                              {it.quantity} × {q.currency} {rand(it.unit_price)}
                            </span>
                            <span className="w-20 text-right font-mono text-xs text-gray-700">
                              {q.currency} {rand(it.quantity * it.unit_price)}
                            </span>
                            {it.description && (
                              <span className="w-full text-xs text-gray-500">{it.description}</span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                    {editable ? (
                      <button
                        type="button"
                        onClick={() => startEdit(q)}
                        className="w-fit rounded-full border-2 border-accent-light px-4 py-2 text-xs font-medium text-gray-700 hover:border-accent"
                      >
                        Edit line items
                      </button>
                    ) : (
                      <p className="text-xs text-gray-400">
                        A {q.status} quote&apos;s line items can&apos;t be changed.
                      </p>
                    )}
                  </>
                )}

                {result?.id === q.id && (
                  <p
                    className={`rounded-lg border-2 px-3 py-2 text-xs ${
                      result.ok
                        ? "border-green-200 bg-green-50 text-green-700"
                        : "border-red-200 bg-red-50 text-red-700"
                    }`}
                  >
                    {result.message}
                  </p>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
