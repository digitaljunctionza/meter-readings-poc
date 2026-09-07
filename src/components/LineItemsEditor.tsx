"use client";

import type { QuoteFormLineItem } from "@/app/admin/quotes/actions";

export function emptyItem(): QuoteFormLineItem {
  return { name: "", description: "", quantity: "1", unitPrice: "", vatRate: "15" };
}

/**
 * The line-item grid shared by the new-quote form and the edit-items panel on
 * an existing quote. Holds no state of its own — the parent owns the array so
 * it can seed it (blank for a new quote, the quote's current items for an
 * edit) and read it back on submit.
 */
export function LineItemsEditor({
  items,
  onChange,
  disabled,
}: {
  items: QuoteFormLineItem[];
  onChange: (items: QuoteFormLineItem[]) => void;
  disabled?: boolean;
}) {
  function updateItem(index: number, patch: Partial<QuoteFormLineItem>) {
    onChange(items.map((it, i) => (i === index ? { ...it, ...patch } : it)));
  }

  return (
    <div className="flex flex-col gap-2">
      <span className="text-xs font-bold text-accent">Line items</span>
      {items.map((item, i) => (
        <div key={i} className="grid grid-cols-1 gap-2 rounded-lg border-2 border-accent-light p-3 sm:grid-cols-12">
          <input
            type="text"
            placeholder="Item name"
            required
            disabled={disabled}
            value={item.name}
            onChange={(e) => updateItem(i, { name: e.target.value })}
            className="rounded-lg border-2 border-accent-light bg-white px-2.5 py-2 text-sm outline-none focus:border-accent disabled:opacity-50 sm:col-span-4"
          />
          <input
            type="text"
            placeholder="Description (optional)"
            disabled={disabled}
            value={item.description}
            onChange={(e) => updateItem(i, { description: e.target.value })}
            className="rounded-lg border-2 border-accent-light bg-white px-2.5 py-2 text-sm outline-none focus:border-accent disabled:opacity-50 sm:col-span-3"
          />
          <input
            type="number"
            min="0"
            step="1"
            placeholder="Qty"
            disabled={disabled}
            value={item.quantity}
            onChange={(e) => updateItem(i, { quantity: e.target.value })}
            className="rounded-lg border-2 border-accent-light bg-white px-2.5 py-2 text-sm outline-none focus:border-accent disabled:opacity-50 sm:col-span-2"
          />
          <input
            type="number"
            min="0"
            step="0.01"
            placeholder="Unit price (R)"
            disabled={disabled}
            value={item.unitPrice}
            onChange={(e) => updateItem(i, { unitPrice: e.target.value })}
            className="rounded-lg border-2 border-accent-light bg-white px-2.5 py-2 text-sm outline-none focus:border-accent disabled:opacity-50 sm:col-span-2"
          />
          <div className="flex items-center gap-1 sm:col-span-1">
            <input
              type="number"
              min="0"
              step="0.1"
              disabled={disabled}
              value={item.vatRate}
              onChange={(e) => updateItem(i, { vatRate: e.target.value })}
              className="w-full rounded-lg border-2 border-accent-light bg-white px-2 py-2 text-sm outline-none focus:border-accent disabled:opacity-50"
            />
            <span className="text-xs text-gray-400">%</span>
          </div>
          {items.length > 1 && !disabled && (
            <button
              type="button"
              onClick={() => onChange(items.filter((_, idx) => idx !== i))}
              className="text-left text-xs text-red-600 underline sm:col-span-12"
            >
              Remove item
            </button>
          )}
        </div>
      ))}
      {!disabled && (
        <button
          type="button"
          onClick={() => onChange([...items, emptyItem()])}
          className="w-fit rounded-full border-2 border-accent-light px-3 py-1.5 text-xs font-medium text-gray-700 hover:border-accent"
        >
          + Add item
        </button>
      )}
    </div>
  );
}
