"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import {
  createQuote,
  getQuote,
  updateQuote,
  isEditableQuoteStatus,
  type QuoteLineItem,
} from "@/lib/rebill/client";

export interface QuoteFormLineItem {
  name: string;
  description: string;
  quantity: string;
  unitPrice: string; // Rand, as typed — converted to cents before the API call
  vatRate: string; // percent, as typed — converted to basis points
}

/**
 * Turn the form's string fields into the API's typed line items: Rand → cents,
 * percent → basis points. Throws on the first row with a bad number so the
 * admin sees which item to fix. Rows with a blank name are dropped (the form
 * always keeps one empty row around).
 */
function toApiLineItems(items: QuoteFormLineItem[]): QuoteLineItem[] {
  return items
    .filter((i) => i.name.trim())
    .map((i) => {
      const quantity = Number.parseFloat(i.quantity);
      const rand = Number.parseFloat(i.unitPrice);
      const vatPercent = Number.parseFloat(i.vatRate);
      if (!Number.isFinite(quantity) || quantity <= 0) {
        throw new Error(`"${i.name}": quantity must be a positive number.`);
      }
      if (!Number.isFinite(rand) || rand < 0) {
        throw new Error(`"${i.name}": unit price must be a number.`);
      }
      return {
        type: "service",
        name: i.name.trim(),
        description: i.description.trim() || undefined,
        quantity,
        unit_price: Math.round(rand * 100),
        vat_type: "exclusive",
        vat_rate: Number.isFinite(vatPercent) ? Math.round(vatPercent * 100) : 1500,
      };
    });
}

export async function createQuoteAction(params: {
  rebillClientId: string;
  quoteDate: string;
  expiryDate: string;
  notes: string;
  items: QuoteFormLineItem[];
}) {
  await requireAdmin();

  if (!params.rebillClientId) throw new Error("Pick a client linked to Rebill.");
  if (!params.quoteDate || !params.expiryDate) throw new Error("Quote date and expiry date are required.");

  const items = toApiLineItems(params.items);
  if (items.length === 0) throw new Error("Add at least one line item.");

  const result = await createQuote({
    client_id: params.rebillClientId,
    quote_date: params.quoteDate,
    expiry_date: params.expiryDate,
    items,
    notes: params.notes.trim() || undefined,
  });

  revalidatePath("/admin/quotes");
  return result;
}

/**
 * Replace the line items on an existing quote. The client sends only the quote
 * id and the new rows; everything else (which client, the dates, the status
 * gate) is re-read from Rebill here so a stale or forged form can't retarget
 * the update. Rebill's PUT wants the full quote body, not a patch, so the
 * unchanged client_id and dates are sent back alongside the new items.
 */
export async function updateQuoteItemsAction(params: {
  quoteId: string;
  items: QuoteFormLineItem[];
}) {
  await requireAdmin();

  if (!params.quoteId) throw new Error("Missing quote.");

  const quote = await getQuote(params.quoteId);
  if (!isEditableQuoteStatus(quote.status)) {
    throw new Error(`This quote is ${quote.status} and its line items can't be changed.`);
  }

  const items = toApiLineItems(params.items);
  if (items.length === 0) throw new Error("Add at least one line item.");

  const result = await updateQuote(params.quoteId, {
    client_id: quote.client_id,
    quote_date: quote.quote_date.slice(0, 10),
    expiry_date: quote.expiry_date.slice(0, 10),
    items,
  });

  revalidatePath("/admin/quotes");
  return result;
}
