"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { Property, Service } from "@/lib/types";

export default function CapturePage() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [propertyId, setPropertyId] = useState("");
  const [unitNumber, setUnitNumber] = useState("");
  const [service, setService] = useState<Service>("electricity");
  const [rawValue, setRawValue] = useState("");
  const [notes, setNotes] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);

  useEffect(() => {
    supabase
      .from("properties")
      .select("*")
      .order("name")
      .then(({ data }) => setProperties((data as Property[]) ?? []));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setResult(null);

    if (!propertyId || !unitNumber || !rawValue || !photo) {
      setResult({ ok: false, message: "Please fill in every field and attach a photo." });
      return;
    }

    setSubmitting(true);
    try {
      const ext = photo.name.split(".").pop() || "jpg";
      const path = `${propertyId}/${unitNumber}-${service}-${Date.now()}.${ext}`;
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
          unit_number: unitNumber,
          property_id: propertyId,
          service,
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
      setUnitNumber("");
      setRawValue("");
      setNotes("");
      setPhoto(null);
      const photoInput = document.getElementById("photo-input") as HTMLInputElement | null;
      if (photoInput) photoInput.value = "";
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
          className="flex h-8 w-8 items-center justify-center text-white"
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
        <h1 className="text-sm font-bold text-white">Capture Reading</h1>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4 border-2 border-t-0 border-accent-light rounded-b-2xl px-4 py-5">
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-bold text-accent">Property</span>
          <select
            className="w-full appearance-none rounded-lg border-2 border-accent-light bg-white px-4 py-3 text-gray-900 outline-none focus:border-accent"
            value={propertyId}
            onChange={(e) => setPropertyId(e.target.value)}
            required
          >
            <option value="">Select provider</option>
            {properties.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-bold text-accent">Unit number</span>
          <input
            type="text"
            className="w-full rounded-lg border-2 border-accent-light bg-white px-4 py-3 text-gray-900 outline-none placeholder:text-gray-400 focus:border-accent"
            value={unitNumber}
            onChange={(e) => setUnitNumber(e.target.value)}
            placeholder="Enter unit number"
            required
          />
        </label>

        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-bold text-accent">Service</span>
          <div className="flex gap-2 rounded-lg border-2 border-accent-light p-1">
            {(["electricity", "water"] as const).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setService(s)}
                className={`flex-1 rounded-md py-2.5 text-sm font-medium capitalize transition-colors ${
                  service === s
                    ? "bg-accent text-white"
                    : "text-gray-600 hover:bg-accent-light"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

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
