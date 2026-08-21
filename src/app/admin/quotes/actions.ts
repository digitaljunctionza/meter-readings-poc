"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { createQuote, type QuoteLineItem } from "@/lib/rebill/client";

export interface QuoteFormLineItem {
  name: string;
  description: string;
  quantity: string;
  unitPrice: string; // Rand, as typed — converted to cents before the API call
  vatRate: string; // percent, as typed — converted to basis points
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

  const items: QuoteLineItem[] = params.items
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
