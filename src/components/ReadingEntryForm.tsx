"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/browser";
import { formatDate } from "@/lib/date";
import { haptic } from "@/lib/haptics";
import { queueReading } from "@/lib/offlineQueue";
import type { Service } from "@/lib/types";

function looksOffline(err: unknown): boolean {
  if (typeof navigator !== "undefined" && !navigator.onLine) return true;
  const message = err instanceof Error ? err.message : String(err);
  return /network|fetch|offline/i.test(message);
}

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", ".", "0", "back"] as const;

function groupThousands(intPart: string): string {
  return intPart.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}

export function ReadingEntryForm({
  propertyId,
  propertyName,
  meterId,
  unitNumber,
  service,
  locationNote,
  meterLabel,
  meterPosition,
  meterTotal,
  previousValue,
  previousCapturedAt,
  trailingAverage,
}: {
  propertyId: string;
  propertyName: string;
  meterId: string;
  unitNumber: string | null;
  service: Service;
  locationNote: string | null;
  meterLabel: string;
  meterPosition: number;
  meterTotal: number;
  previousValue: number | null;
  previousCapturedAt: string | null;
  trailingAverage: number | null;
}) {
  const router = useRouter();
  const [raw, setRaw] = useState("");
  const [note, setNote] = useState("");
  const [showNote, setShowNote] = useState(false);
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function press(ch: string) {
    haptic("tap");
    setRaw((s) => {
      if (ch === "back") return s.slice(0, -1);
      if (ch === "." && s.includes(".")) return s;
      if (s.replace(".", "").length >= 9) return s;
      return s + ch;
    });
  }

  const { display, delta, deltaTone, hint } = useMemo(() => {
    if (raw === "") {
      return {
        display: "0",
        delta: "—",
        deltaTone: "muted" as const,
        hint: "Type the dials left to right. Leading zeros are fine.",
      };
    }
    const [intPart, frac] = raw.split(".");
    const displayValue = groupThousands(intPart || "") + (raw.includes(".") ? "." + (frac || "") : "");
    const num = Number.parseFloat(raw);
    if (Number.isNaN(num) || previousValue === null) {
      return {
        display: displayValue,
        delta: "—",
        deltaTone: "muted" as const,
        hint:
          previousValue === null
            ? "No previous reading — this will be the first for this meter."
            : "Type the dials left to right. Leading zeros are fine.",
      };
    }
    const d = num - previousValue;
    if (d < 0) {
      return {
        display: displayValue,
        delta: d.toFixed(1),
        deltaTone: "negative" as const,
        hint: "Lower than last month. Check you read the right dial before saving.",
      };
    }
    const isHigh = trailingAverage !== null && trailingAverage > 0 && d > trailingAverage * 3;
    return {
      display: displayValue,
      delta: `+${d.toFixed(1)}`,
      deltaTone: isHigh ? ("high" as const) : ("normal" as const),
      hint: isHigh
        ? "Well above this meter's usual month. Worth a second look."
        : "In line with this meter's recent history.",
    };
  }, [raw, previousValue, trailingAverage]);

  const deltaColorClass =
    deltaTone === "negative"
      ? "text-red-600"
      : deltaTone === "high"
        ? "text-amber-600"
        : deltaTone === "normal"
          ? "text-green-700"
          : "text-text-muted";

  function handlePhotoChange(file: File | null) {
    setPhoto(file);
    setPhotoPreview((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return file ? URL.createObjectURL(file) : null;
    });
  }

  async function saveOffline(capturedAt: string): Promise<boolean> {
    if (!photo) return false;
    try {
      await queueReading({
        propertyId,
        meterId,
        meterLabel,
        unitNumber,
        service,
        rawValue: raw,
        notes: note || null,
        capturedAt,
        photo,
        photoName: photo.name,
      });
      router.push(`/capture/${propertyId}`);
      router.refresh();
      return true;
    } catch {
      // IndexedDB itself failed (private mode, storage disabled) — nothing
      // left to fall back to, the caller shows the original error instead.
      return false;
    }
  }

  async function handleSubmit() {
    setError(null);
    if (!raw || !photo) {
      haptic("error");
      setError("Enter a reading and attach a photo before saving.");
      return;
    }
    // Fires on the tap rather than after the upload: Android drops vibrate()
    // once the user activation that authorised it has expired, and a photo
    // upload is easily long enough for that to happen.
    haptic("success");
    setSubmitting(true);
    const capturedAt = new Date().toISOString();

    // No signal at all — skip straight to the local queue rather than
    // waiting out a network timeout first.
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      if (await saveOffline(capturedAt)) return;
      haptic("error");
      setError("You're offline and this device couldn't save the reading locally either.");
      setSubmitting(false);
      return;
    }

    try {
      const supabase = createClient();
      const ext = photo.name.split(".").pop() || "jpg";
      const path = `${propertyId}/${meterId}-${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage.from("meter-photos").upload(path, photo);
      if (uploadError) throw new Error(`Photo upload failed: ${uploadError.message}`);

      const { data: publicUrlData } = supabase.storage.from("meter-photos").getPublicUrl(path);

      const res = await fetch("/api/readings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          meter_id: meterId,
          raw_value: raw,
          photo_url: publicUrlData.publicUrl,
          notes: note || null,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to save reading");

      router.push(`/capture/${propertyId}`);
      router.refresh();
    } catch (err) {
      // Connection dropped mid-upload (patchy signal on site, not a clean
      // offline start) — same local-queue fallback as the offline fast path.
      if (looksOffline(err) && (await saveOffline(capturedAt))) return;
      haptic("error");
      setError(err instanceof Error ? err.message : "Unknown error");
      setSubmitting(false);
    }
  }

  const title = unitNumber ? `Unit ${unitNumber} · ${service === "water" ? "Water" : "Electricity"}` : meterLabel;

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col bg-app-bg">
      <div className="flex-none border-b border-border bg-surface px-5 pb-3.5 pt-[calc(env(safe-area-inset-top)+14px)]">
        <div className="flex items-center gap-3">
          <Link
            href={`/capture/${propertyId}`}
            aria-label="Back to meter list"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-border"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M15 5l-7 7 7 7" stroke="var(--navy-900)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Link>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[17px] font-bold text-navy-900">{title}</p>
            <p className="truncate text-[11px] text-text-muted">
              {propertyName} · meter {meterPosition} of {meterTotal}
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-5 py-4">
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            aria-label={photo ? "Retake photo" : "Attach a meter photo"}
            className="relative h-[92px] w-[92px] shrink-0 overflow-hidden rounded-xl bg-navy-900"
          >
            {photoPreview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={photoPreview} alt="Meter photo" className="h-full w-full object-cover" />
            ) : (
              <span className="flex h-full w-full flex-col items-center justify-center gap-1 text-white/60">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path
                    d="M4 8.5A2.5 2.5 0 0 1 6.5 6h1L9 4h6l1.5 2h1A2.5 2.5 0 0 1 20 8.5v8A2.5 2.5 0 0 1 17.5 19h-11A2.5 2.5 0 0 1 4 16.5z"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <circle cx="12" cy="12.5" r="3.2" stroke="currentColor" strokeWidth="1.6" />
                </svg>
                <span className="text-[10px]">Add photo</span>
              </span>
            )}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => handlePhotoChange(e.target.files?.[0] ?? null)}
          />
          <div className="flex min-w-0 flex-1 flex-col justify-between py-0.5">
            <p className={`text-[11px] font-medium ${photo ? "text-green-700" : "text-text-muted"}`}>
              {photo ? "Photo attached" : locationNote || "Required before saving"}
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="min-h-[44px] flex-1 rounded-lg border border-border bg-surface text-xs font-semibold text-navy-900"
              >
                {photo ? "Retake" : "Take photo"}
              </button>
              {photoPreview && (
                <a
                  href={photoPreview}
                  target="_blank"
                  rel="noreferrer"
                  className="flex min-h-[44px] flex-1 items-center justify-center rounded-lg border border-border bg-surface text-xs font-semibold text-navy-900"
                >
                  View
                </a>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <span className="font-mono text-[10px] font-medium tracking-[0.08em] text-text-muted">
            READING · {service === "water" ? "kl" : "kWh"}
          </span>
          <div className="flex min-h-[56px] items-baseline gap-2">
            <span className="font-mono text-[46px] font-bold leading-none tracking-tight text-navy-900 tabular-nums">
              {display}
            </span>
            <span className="h-[38px] w-[3px] bg-green-500" />
          </div>
          <div className="flex items-center justify-between border-t border-border pt-2.5">
            <span className="text-xs text-text-muted">
              {previousValue !== null
                ? `Last ${previousValue.toLocaleString("en-US")}${previousCapturedAt ? ` on ${formatDate(previousCapturedAt)}` : ""}`
                : "No previous reading"}
            </span>
            <span className={`font-mono text-[13px] font-semibold tabular-nums ${deltaColorClass}`}>{delta}</span>
          </div>
          <p className="text-[11px] leading-snug text-text-muted">{hint}</p>
        </div>

        <div className="grid grid-cols-3 gap-2">
          {KEYS.map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => press(k)}
              aria-label={k === "back" ? "Backspace" : k}
              className={`flex h-[52px] items-center justify-center rounded-xl border border-border font-mono text-[22px] font-semibold text-navy-900 transition-colors active:bg-green-500 active:text-white active:border-green-500 ${
                k === "." || k === "back" ? "bg-divider" : "bg-surface"
              }`}
            >
              {k === "back" ? (
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M9 5h11v14H9L3 12z" stroke="var(--navy-900)" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M12 9.5l5 5M17 9.5l-5 5" stroke="var(--navy-900)" strokeWidth="1.9" strokeLinecap="round" />
                </svg>
              ) : (
                k
              )}
            </button>
          ))}
        </div>

        {showNote ? (
          <label className="flex flex-col gap-1.5">
            <span className="font-mono text-[10px] font-medium tracking-[0.08em] text-text-muted">
              NOTE TO WAYNE (OPTIONAL)
            </span>
            <textarea
              className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-navy-900 outline-none focus:border-green-500"
              rows={2}
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </label>
        ) : (
          <button
            type="button"
            onClick={() => setShowNote(true)}
            className="self-start text-xs font-medium text-blue-500 underline-offset-2 hover:underline"
          >
            + Add a note
          </button>
        )}

        {error && (
          <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p>
        )}
      </div>

      <div className="flex-none border-t border-border bg-surface px-5 pb-[calc(env(safe-area-inset-bottom)+14px)] pt-3">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={submitting}
          className="min-h-[54px] w-full rounded-2xl bg-green-500 text-[15px] font-bold text-white transition-opacity disabled:opacity-50"
        >
          {submitting ? "Saving…" : "Save & next"}
        </button>
      </div>
    </main>
  );
}
