"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createMeter, deleteMeter } from "@/app/admin/clients/actions";
import type { Meter, Service } from "@/lib/types";

const SERVICE_COLOR: Record<Service, string> = {
  electricity: "text-amber-600 border-amber-200",
  water: "text-blue-600 border-blue-200",
};

export interface MeterRow extends Meter {
  unit_number: string | null;
  reading_count: number;
}

export function MeterManager({
  propertyId,
  meters,
}: {
  propertyId: string;
  meters: MeterRow[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [service, setService] = useState<Service>("electricity");
  const [unitNumber, setUnitNumber] = useState("");
  const [label, setLabel] = useState("");
  const [locationNote, setLocationNote] = useState("");
  const [isCommunal, setIsCommunal] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Default the label from unit + service so Wayne rarely has to type it.
  const effectiveLabel =
    label.trim() ||
    (isCommunal
      ? ""
      : unitNumber.trim()
        ? `${unitNumber.trim()} - ${service === "electricity" ? "Electricity" : "Water"}`
        : "");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      try {
        await createMeter({
          propertyId,
          service,
          label: effectiveLabel,
          unitNumber: isCommunal ? null : unitNumber || null,
          locationNote: locationNote || null,
          isCommunal,
        });
        setUnitNumber("");
        setLabel("");
        setLocationNote("");
        setIsCommunal(false);
        setOpen(false);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to add meter");
      }
    });
  }

  function handleDelete(meterId: string) {
    setError(null);
    startTransition(async () => {
      try {
        await deleteMeter(meterId);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to delete meter");
      }
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-bold text-accent">
          Meters ({meters.length})
        </span>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="rounded-full border-2 border-accent-light px-3 py-1.5 text-xs font-medium text-gray-700 hover:border-accent"
        >
          {open ? "Cancel" : "+ Add meter"}
        </button>
      </div>

      {open && (
        <form
          onSubmit={handleSubmit}
          className="flex flex-col gap-3 rounded-lg border-2 border-accent-light p-3"
        >
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-bold text-accent">Service</span>
            <div className="flex gap-2 rounded-lg border-2 border-accent-light p-1">
              {(["electricity", "water"] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setService(s)}
                  className={`flex-1 rounded-md py-2 text-xs font-medium capitalize ${
                    service === s ? "bg-accent text-white" : "text-gray-600"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={isCommunal}
              onChange={(e) => setIsCommunal(e.target.checked)}
              className="h-4 w-4"
            />
            <span className="text-xs font-medium text-gray-700">
              Communal meter (not tied to a unit)
            </span>
          </label>

          {!isCommunal && (
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-bold text-accent">Unit number</span>
              <input
                type="text"
                value={unitNumber}
                onChange={(e) => setUnitNumber(e.target.value)}
                placeholder="e.g. 101"
                className="w-full rounded-lg border-2 border-accent-light bg-white px-3 py-2 text-sm outline-none focus:border-accent"
              />
            </label>
          )}

          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-bold text-accent">
              Label {!isCommunal && <span className="font-normal text-gray-400">(auto)</span>}
            </span>
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              required={isCommunal}
              placeholder={isCommunal ? "e.g. Main Water Meter" : effectiveLabel || "e.g. 101 - Electricity"}
              className="w-full rounded-lg border-2 border-accent-light bg-white px-3 py-2 text-sm outline-none focus:border-accent"
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-bold text-accent">Location note (optional)</span>
            <input
              type="text"
              value={locationNote}
              onChange={(e) => setLocationNote(e.target.value)}
              placeholder="e.g. Basement meter room, left wall"
              className="w-full rounded-lg border-2 border-accent-light bg-white px-3 py-2 text-sm outline-none focus:border-accent"
            />
          </label>

          <button
            type="submit"
            disabled={isPending || !effectiveLabel}
            className="w-fit rounded-full bg-accent px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            {isPending ? "Adding..." : "Add meter"}
          </button>
        </form>
      )}

      {error && (
        <p className="rounded-lg border-2 border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          {error}
        </p>
      )}

      {meters.length > 0 && (
        <div className="flex flex-col gap-1.5">
          {meters.map((m) => (
            <div
              key={m.id}
              className="flex items-center gap-2 rounded-lg border-2 border-accent-light px-3 py-2 text-xs"
            >
              <span
                className={`shrink-0 rounded-full border-2 bg-white px-2 py-0.5 font-medium capitalize ${SERVICE_COLOR[m.service]}`}
              >
                {m.service}
              </span>
              <span className="min-w-0 flex-1 truncate font-medium text-gray-800">
                {m.label}
                {m.is_communal && (
                  <span className="ml-1.5 font-normal text-gray-400">communal</span>
                )}
              </span>
              <span className="shrink-0 text-gray-500">
                {m.reading_count} reading{m.reading_count === 1 ? "" : "s"}
              </span>
              {m.reading_count === 0 && (
                <button
                  type="button"
                  onClick={() => handleDelete(m.id)}
                  disabled={isPending}
                  className="shrink-0 text-red-600 underline disabled:opacity-50"
                >
                  Delete
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
