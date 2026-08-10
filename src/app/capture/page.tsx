"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/browser";
import { LogoutButton } from "@/components/LogoutButton";
import { formatDateTime } from "@/lib/date";
import type { Client, Meter, Property } from "@/lib/types";

interface PreviousReading {
  reading_value: number;
  captured_at: string;
}

export default function CapturePage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [meters, setMeters] = useState<Meter[]>([]);

  const [clientId, setClientId] = useState("");
  const [propertyId, setPropertyId] = useState("");
  const [meterId, setMeterId] = useState("");

  const [previous, setPrevious] = useState<PreviousReading | null>(null);
  const [previousLoading, setPreviousLoading] = useState(false);

  const [rawValue, setRawValue] = useState("");
  const [notes, setNotes] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("clients")
      .select("*")
      .order("name")
      .then(({ data }) => setClients((data as Client[]) ?? []));
  }, []);

  useEffect(() => {
    setPropertyId("");
    setProperties([]);
    if (!clientId) return;
    const supabase = createClient();
    supabase
      .from("properties")
      .select("*")
      .eq("client_id", clientId)
      .order("name")
      .then(({ data }) => setProperties((data as Property[]) ?? []));
  }, [clientId]);

  useEffect(() => {
    setMeterId("");
    setMeters([]);
    if (!propertyId) return;
    const supabase = createClient();
    supabase
      .from("meters")
      .select("*")
      .eq("property_id", propertyId)
      .order("label")
      .then(({ data }) => setMeters((data as Meter[]) ?? []));
  }, [propertyId]);

  // Show the last reading for this meter so Wayne can sanity-check before saving.
  useEffect(() => {
    setPrevious(null);
    if (!meterId) return;
    setPreviousLoading(true);
    const supabase = createClient();
    supabase
      .from("meter_readings")
      .select("reading_value, captured_at")
      .eq("meter_id", meterId)
      .order("captured_at", { ascending: false })
      .limit(1)
      .then(({ data }) => {
        setPrevious((data?.[0] as PreviousReading | undefined) ?? null);
        setPreviousLoading(false);
      });
  }, [meterId]);

  const selectedMeter = meters.find((m) => m.id === meterId);

  const resetAfterSubmit = useCallback(() => {
    setRawValue("");
    setNotes("");
    setPhoto(null);
    const photoInput = document.getElementById("photo-input") as HTMLInputElement | null;
    if (photoInput) photoInput.value = "";
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setResult(null);

    if (!meterId || !rawValue || !photo) {
      setResult({
        ok: false,
        message: "Please pick a meter, enter a reading, and attach a photo.",
      });
      return;
    }

    setSubmitting(true);
    try {
      const supabase = createClient();
      const ext = photo.name.split(".").pop() || "jpg";
      const path = `${propertyId}/${meterId}-${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("meter-photos")
        .upload(path, photo);

      if (uploadError) {
        throw new Error(`Photo upload failed: ${uploadError.message}`);
      }

      const { data: publicUrlData } = supabase.storage.from("meter-photos").getPublicUrl(path);

      const res = await fetch("/api/readings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          meter_id: meterId,
          raw_value: rawValue,
          photo_url: publicUrlData.publicUrl,
          notes: notes || null,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Failed to save reading");
      }

      const flag = json.reading.flag_status;
      setResult({
        ok: true,
        message:
          flag === "ok"
            ? "Reading saved."
            : `Reading saved, but flagged: ${flag.replace(/_/g, " ")}.`,
      });
      resetAfterSubmit();
      // What we just saved is now the previous reading for this meter.
      setPrevious({
        reading_value: json.reading.reading_value,
        captured_at: json.reading.captured_at,
      });
    } catch (err) {
      setResult({ ok: false, message: err instanceof Error ? err.message : "Unknown error" });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col bg-white px-5 py-6">
      <div className="mb-6 flex items-center gap-3 rounded-t-2xl bg-accent px-3 py-3">
        <Link
          href="/"
          aria-label="Back to home"
          className="flex h-10 w-10 items-center justify-center text-white"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
              d="M15 18l-6-6 6-6"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </Link>
        <h1 className="flex-1 text-sm font-bold text-white">Capture Reading</h1>
        <LogoutButton className="flex h-10 shrink-0 items-center rounded-full px-3 text-sm font-medium text-white/80" />
      </div>

      <form
        onSubmit={handleSubmit}
        className="flex flex-col gap-4 rounded-b-2xl border-2 border-t-0 border-accent-light px-4 py-5"
      >
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-bold text-accent">Client</span>
          <select
            className="w-full appearance-none rounded-lg border-2 border-accent-light bg-white px-4 py-3 text-gray-900 outline-none focus:border-accent"
            value={clientId}
            onChange={(e) => setClientId(e.target.value)}
            required
          >
            <option value="">Select a client</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-bold text-accent">Property</span>
          <select
            className="w-full appearance-none rounded-lg border-2 border-accent-light bg-white px-4 py-3 text-gray-900 outline-none focus:border-accent disabled:bg-gray-50 disabled:text-gray-400"
            value={propertyId}
            onChange={(e) => setPropertyId(e.target.value)}
            disabled={!clientId}
            required
          >
            <option value="">Select a property</option>
            {properties.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-bold text-accent">Meter</span>
          <select
            className="w-full appearance-none rounded-lg border-2 border-accent-light bg-white px-4 py-3 text-gray-900 outline-none focus:border-accent disabled:bg-gray-50 disabled:text-gray-400"
            value={meterId}
            onChange={(e) => setMeterId(e.target.value)}
            disabled={!propertyId}
            required
          >
            <option value="">Select a meter</option>
            {meters.map((m) => (
              <option key={m.id} value={m.id}>
                {m.label}
              </option>
            ))}
          </select>
          {propertyId && meters.length === 0 && (
            <span className="text-xs text-gray-500">
              This property has no meters yet.{" "}
              <Link href="/admin/clients" className="text-accent underline">
                Add one
              </Link>
              .
            </span>
          )}
        </label>

        {selectedMeter && (
          <div className="rounded-lg border-2 border-accent-light bg-accent-light/40 px-4 py-3 text-sm">
            {selectedMeter.location_note && (
              <p className="mb-1 text-gray-600">{selectedMeter.location_note}</p>
            )}
            {previousLoading ? (
              <p className="text-gray-500">Checking previous reading...</p>
            ) : previous ? (
              <p className="text-gray-700">
                Previous:{" "}
                <span className="font-bold text-accent">
                  {previous.reading_value.toLocaleString()}
                </span>{" "}
                <span className="text-gray-500">on {formatDateTime(previous.captured_at)}</span>
              </p>
            ) : (
              <p className="text-gray-500">No previous reading - this will be the first.</p>
            )}
          </div>
        )}

        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-bold text-accent">Reading value</span>
          <input
            type="text"
            inputMode="decimal"
            className="w-full rounded-lg border-2 border-accent-light bg-white px-4 py-3 text-gray-900 outline-none placeholder:text-gray-400 focus:border-accent"
            value={rawValue}
            onChange={(e) => setRawValue(e.target.value)}
            placeholder="e.g. 1208222.5"
            required
          />
          {previous && rawValue && Number(rawValue) < previous.reading_value && (
            <span className="text-xs font-medium text-red-600">
              Lower than the previous reading - check before saving.
            </span>
          )}
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-bold text-accent">Meter photo</span>
          <input
            id="photo-input"
            type="file"
            accept="image/*"
            capture="environment"
            className="w-full rounded-lg border-2 border-accent-light bg-white px-4 py-3 text-sm text-gray-900 outline-none file:mr-3 file:rounded-full file:border-0 file:bg-accent-light file:px-3 file:py-1.5 file:text-accent focus:border-accent"
            onChange={(e) => setPhoto(e.target.files?.[0] ?? null)}
            required
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-bold text-accent">Notes (optional)</span>
          <textarea
            className="w-full rounded-lg border-2 border-accent-light bg-white px-4 py-3 text-gray-900 outline-none placeholder:text-gray-400 focus:border-accent"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
          />
        </label>

        <button
          type="submit"
          disabled={submitting}
          className="mt-2 w-full rounded-full bg-accent py-4 text-base font-semibold text-white transition-opacity disabled:opacity-50"
        >
          {submitting ? "Saving..." : "Submit reading"}
        </button>
      </form>

      {result && (
        <p
          className={`mt-4 rounded-lg border-2 px-4 py-3 text-sm ${
            result.ok
              ? "border-green-200 bg-green-50 text-green-700"
              : "border-red-200 bg-red-50 text-red-700"
          }`}
        >
          {result.message}
        </p>
      )}
    </main>
  );
}
