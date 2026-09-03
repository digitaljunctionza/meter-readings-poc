// Rebill (app.rebill.co.za) API client.
//
// Schema below is transcribed from https://help.rebill.co.za/api/quotes/ and
// https://help.rebill.co.za/api/getting-started/ (fetched 2026-08-18) — not
// guessed.
//
// Base URL note: Rebill's own docs and their Settings → API Access example
// both show the raw Cloud Run URL
// (rebill-api-896466068278.africa-south1.run.app) — that URL 404s on every
// path/method from every network we tested. Rebill support (2026-08-20)
// confirmed the actual public base URL is https://api.rebill.co.za —
// confirmed working (200, real JSON) as of that date. If this starts 404ing
// again, that's the first thing to re-check, not this code.

const REBILL_API_BASE = process.env.REBILL_API_BASE?.replace(/\/$/, "");
const REBILL_API_KEY = process.env.REBILL_API_KEY;

export function isConfigured(): boolean {
  return !!(REBILL_API_BASE && REBILL_API_KEY);
}

export class RebillError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "RebillError";
    this.status = status;
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  if (!isConfigured()) {
    throw new RebillError(
      "Rebill is not configured — set REBILL_API_KEY and REBILL_API_BASE.",
      0
    );
  }

  const res = await fetch(`${REBILL_API_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${REBILL_API_KEY}`,
      "Content-Type": "application/json",
      ...init.headers,
    },
  });

  const bodyText = await res.text();
  if (!res.ok) {
    throw new RebillError(
      `Rebill request failed: ${res.status} ${res.statusText}${bodyText ? ` — ${bodyText.slice(0, 300)}` : ""}`,
      res.status
    );
  }

  return bodyText ? (JSON.parse(bodyText) as T) : (undefined as T);
}

export interface RebillClient {
  id: string;
  name: string;
  surname?: string;
  /** Present for body-corporate / business clients; absent for individuals. */
  business_name?: string;
  email: string;
  phone?: string;
}

/**
 * GET /client — confirmed against the real API 2026-08-20. Rebill's docs
 * don't document a search/filter param, so this fetches the full list and
 * the caller filters client-side.
 */
export async function listClients(): Promise<RebillClient[]> {
  const { clients } = await request<{ clients: RebillClient[] }>("/client");
  return clients;
}

export interface CreateRebillClientParams {
  /** First name, or the company name for a body corporate. The only required field. */
  name: string;
  surname?: string;
  /** Registered business name — the right field for a body corporate. */
  business_name?: string;
  email?: string;
  /** E.164, e.g. "+27821234567". */
  phone?: string;
  /** Max 64 characters. */
  vat_number?: string;
}

/**
 * POST /client — schema transcribed from https://help.rebill.co.za/api/clients/
 * (fetched 2026-09-03), not guessed. Returns 201 with just the new id.
 *
 * Rebill's free plan caps an account at 5 clients; past that the API rejects
 * the call and the error surfaces through RebillError.
 */
export async function createRebillClient(
  params: CreateRebillClientParams
): Promise<{ id: string }> {
  return request<{ id: string }>("/client", {
    method: "POST",
    body: JSON.stringify(params),
  });
}

export type QuoteStatus = "draft" | "sent" | "accepted" | "declined" | "expired" | "converted";

export interface QuoteLineItem {
  type: string; // e.g. "service"
  name: string;
  description?: string;
  quantity: number;
  /** Cents. */
  unit_price: number;
  vat_type?: "exclusive" | "inclusive" | "none";
  /** Basis points, e.g. 1500 = 15%. */
  vat_rate?: number;
}

export interface Quote {
  id: string;
  public_id: string;
  created: string;
  number: string;
  currency: string;
  status: QuoteStatus;
  client_id: string;
  quote_date: string;
  expiry_date: string;
  accepted_at: string | null;
  declined_at: string | null;
  /** Total, in cents. */
  amount: number;
  items: QuoteLineItem[];
  notes: string | null;
  bank_details: string | null;
  deposit_type: "fixed" | "percentage" | null;
  deposit_value: number | null;
  deposit_amount: number | null;
  converted_to_invoice_id: string | null;
  custom_fields: Record<string, unknown> | null;
  vat_enabled: boolean;
}

export interface CreateQuoteParams {
  /** Rebill's client ID — from Client.rebill_client_id in our DB. */
  client_id: string;
  /** ISO date, e.g. "2026-03-15". */
  quote_date: string;
  /** ISO date, e.g. "2026-04-15". */
  expiry_date: string;
  items: QuoteLineItem[];
  currency?: string;
  notes?: string;
  bank_details?: string;
  deposit_type?: "fixed" | "percentage";
  deposit_value?: number;
  custom_fields?: Record<string, unknown>;
}

export async function listQuotes(options?: {
  includeAccepted?: boolean;
  includeDeclined?: boolean;
  includeExpired?: boolean;
  includeConverted?: boolean;
}): Promise<Quote[]> {
  const params = new URLSearchParams();
  if (options?.includeAccepted) params.set("include_accepted", "true");
  if (options?.includeDeclined) params.set("include_declined", "true");
  if (options?.includeExpired) params.set("include_expired", "true");
  if (options?.includeConverted) params.set("include_converted", "true");
  const qs = params.toString();
  const { quotes } = await request<{ quotes: Quote[] }>(`/quote${qs ? `?${qs}` : ""}`);
  return quotes;
}

export async function getQuote(id: string): Promise<Quote> {
  return request<Quote>(`/quote/${id}`);
}

export async function createQuote(params: CreateQuoteParams): Promise<{ id: string }> {
  if (params.items.length === 0) {
    throw new Error("A quote needs at least one line item.");
  }
  return request<{ id: string }>("/quote", {
    method: "POST",
    body: JSON.stringify(params),
  });
}

export async function updateQuote(
  id: string,
  params: Partial<CreateQuoteParams>
): Promise<{ id: string }> {
  return request<{ id: string }>(`/quote/${id}`, {
    method: "PUT",
    body: JSON.stringify(params),
  });
}

export async function deleteQuote(id: string): Promise<void> {
  await request<void>(`/quote/${id}`, { method: "DELETE" });
}

export async function sendQuote(id: string, options?: { whatsapp?: boolean }): Promise<void> {
  const qs = options?.whatsapp ? "?whatsapp=true" : "";
  await request<void>(`/quote/${id}/send${qs}`, { method: "POST" });
}

export async function markQuoteAsSent(id: string): Promise<void> {
  await request<void>(`/quote/${id}/mark_as_sent`, { method: "POST" });
}

export async function convertQuoteToInvoice(id: string): Promise<{ id: string }> {
  return request<{ id: string }>(`/quote/${id}/convert`, { method: "POST" });
}

export async function reinstateQuote(id: string): Promise<void> {
  await request<void>(`/quote/${id}/reinstate`, { method: "POST" });
}
