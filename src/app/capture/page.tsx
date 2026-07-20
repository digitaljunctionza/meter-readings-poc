"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { Property, Service } from "@/lib/types";

interface ServiceFields {
  rawValue: string;
  photo: File | null;
}

const SERVICE_META: Record<
  Service,
  { label: string; textClass: string; borderClass: string; placeholder: string }
> = {
  electricity: {
    label: "Electricity",
    textClass: "text-amber-600",
    borderClass: "border-amber-200 focus:border-amber-500",
    placeholder: "e.g. 58882.5",
  },
  water: {
    label: "Water",
    textClass: "text-blue-600",
    borderClass: "border-blue-200 focus:border-blue-500",
    placeholder: "e.g. 1208222.5",
  },
};

export default function CapturePage() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [propertyId, setPropertyId] = useState("");
  const [unitNumber, setUnitNumber] = useState("");
  const [fields, setFields] = useState<Record<Service, ServiceFields>>({
    electricity: { rawValue: "", photo: null },
    water: { rawValue: "", photo: null },
  });
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);

  useEffect(() => {
    supabase
      .from("properties")
      .select("*")
      .order("name")
      .then(({ data }) => setProperties((data as Property[]) ?? []));
  }, []);

  function updateField(service: Service, patch: Partial<ServiceFields>) {
    setFields((f) => ({ ...f, [service]: { ...f[service], ...patch } }));
  }

  async function submitOne(service: Service) {
    const { rawValue, photo } = fields[service];
    if (!photo) throw new Error(`Missing photo for ${SERVICE_META[service].label}`);

    const ext = photo.name.split(".").pop() || "jpg";
    const path = `${propertyId}/${unitNumber}-${service}-${Date.now()}.${ext}`;
    const { error: uploadError } = await supabase.storage.from("meter-photos").upload(path, photo);
    if (uploadError) {
      throw new Error(`${SERVICE_META[service].label} photo upload failed: ${uploadError.message}`);
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
      throw new Error(`${SERVICE_META[service].label}: ${json.error || "Failed to save reading"}`);
    }
    return json.reading.flag_status as string;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setResult(null);

    const servicesToSubmit = (Object.keys(fields) as Service[]).filter(
      (s) => fields[s].rawValue.trim() !== ""
    );

    if (!propertyId || !unitNumber) {
      setResult({ ok: false, message: "Please select a property and enter a unit number." });
      return;
    }
    if (servicesToSubmit.length === 0) {
      setResult({
        ok: false,
        message: "Enter at least one reading (electricity and/or water).",
      });
      return;
    }
    const missingPhoto = servicesToSubmit.find((s) => !fields[s].photo);
    if (missingPhoto) {
      setResult({
        ok: false,
        message: `Please attach a photo for ${SERVICE_META[missingPhoto].label}.`,
      });
      return;
    }

    setSubmitting(true);
    try {
      const messages: string[] = [];
      for (const service of servicesToSubmit) {
        const flag = await submitOne(service);
        messages.push(
          flag === "ok"
            ? `${SERVICE_META[service].label} saved.`
            : `${SERVICE_META[service].label} saved, flagged: ${flag.replace(/_/g, " ")}.`
        );
      }
      setResult({ ok: true, message: messages.join(" ") });
      setUnitNumber("");
      setNotes("");
      setFields({
        electricity: { rawValue: "", photo: null },
        water: { rawValue: "", photo: null },
      });
      for (const service of ["electricity", "water"] as const) {
        const input = document.getElementById(`photo-input-${service}`) as HTMLInputElement | null;
        if (input) input.value = "";
      }
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

      <form
        onSubmit={handleSubmit}
        className="flex flex-col gap-4 rounded-b-2xl border-2 border-t-0 border-accent-light px-4 py-5"
      >
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

        <p className="text-xs text-gray-500">
          Fill in one or both services below for this unit — both can be submitted together.
        </p>

        {(["electricity", "water"] as const).map((service) => {
          const meta = SERVICE_META[service];
          return (
            <div
              key={service}
              className={`flex flex-col gap-3 rounded-lg border-2 p-3 ${meta.borderClass}`}
            >
              <span className={`text-sm font-bold ${meta.textClass}`}>{meta.label}</span>

              <label className="flex flex-col gap-1.5">
                <span className={`text-xs font-medium ${meta.textClass}`}>Reading value</span>
                <input
                  type="text"
                  inputMode="decimal"
                  className={`w-full rounded-lg border-2 bg-white px-4 py-3 text-gray-900 outline-none placeholder:text-gray-400 ${meta.borderClass}`}
                  value={fields[service].rawValue}
                  onChange={(e) => updateField(service, { rawValue: e.target.value })}
                  placeholder={meta.placeholder}
                />
              </label>

              <label className="flex flex-col gap-1.5">
                <span className={`text-xs font-medium ${meta.textClass}`}>Meter photo</span>
                <input
                  id={`photo-input-${service}`}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className={`w-full rounded-lg border-2 bg-white px-4 py-3 text-sm text-gray-900 outline-none file:mr-3 file:rounded-full file:border-0 file:bg-accent-light file:px-3 file:py-1.5 file:text-accent ${meta.borderClass}`}
                  onChange={(e) => updateField(service, { photo: e.target.files?.[0] ?? null })}
                />
              </label>
            </div>
          );
        })}

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
