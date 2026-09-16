"use server";

import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { buildReportRows, type ReportFilters } from "@/lib/report";
import { buildReportEmailHtml } from "@/lib/email/reportEmail";
import { sendEmail, isEmailConfigured } from "@/lib/email/brevo";
import type { Client, Property } from "@/lib/types";

function monthStartIso(): string {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString().slice(0, 10);
}

/**
 * Emails the client on file for this property the same reading history the
 * admin is looking at: whatever filters are active on the Reports page, or
 * month-to-date when none are set (an unfiltered send would be the
 * property's entire history, which isn't a "report").
 */
export async function emailPropertyReport(propertyId: string, filters?: ReportFilters) {
  await requireAdmin();

  if (!isEmailConfigured()) {
    throw new Error("Email isn't set up yet — add RESEND_API_KEY to send reports.");
  }

  const supabase = await createClient();
  const { data: propertyRow, error: propertyError } = await supabase
    .from("properties")
    .select("*")
    .eq("id", propertyId)
    .single();
  if (propertyError || !propertyRow) throw new Error("Property not found");
  const property = propertyRow as Property;

  const { data: clientRow, error: clientError } = await supabase
    .from("clients")
    .select("*")
    .eq("id", property.client_id)
    .single();
  if (clientError || !clientRow) throw new Error("Client not found");
  const client = clientRow as Client;

  if (!client.contact_email) {
    throw new Error(`${client.name} has no contact email on file — add one under Clients & meters.`);
  }

  const hasFilters = !!(filters?.from || filters?.to || filters?.unitNumber || filters?.service);
  const effectiveFilters: ReportFilters = hasFilters ? filters! : { from: monthStartIso() };

  const rows = await buildReportRows(propertyId, effectiveFilters);

  const periodLabel =
    effectiveFilters.from && effectiveFilters.to
      ? `${effectiveFilters.from} to ${effectiveFilters.to}`
      : effectiveFilters.from
        ? `Since ${effectiveFilters.from}`
        : effectiveFilters.to
          ? `Up to ${effectiveFilters.to}`
          : "All readings";

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://app.wmfixandfinish.co.za";
  const html = buildReportEmailHtml({
    clientName: client.name,
    propertyName: property.name,
    periodLabel,
    rows,
    // /client, not /admin/reports — the recipient signs in as a client user.
    dashboardUrl: `${siteUrl}/client?property=${propertyId}`,
  });

  await sendEmail({
    to: client.contact_email,
    subject: `Meter reading report — ${property.name}`,
    html,
  });

  return { sentTo: client.contact_email };
}
