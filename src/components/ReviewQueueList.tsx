"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { acceptReading, editReading } from "@/app/admin/review/actions";
import { createClient } from "@/lib/supabase/browser";
import { formatDateTime } from "@/lib/date";
import { haptic } from "@/lib/haptics";
import { BAND_META, BAND_ORDER, triageReading, type TriageBand } from "@/lib/triage";
import type { FlagStatus, Service } from "@/lib/types";

export interface ReviewItem {
  readingId: string;
  propertyName: string;
  unitNumber: string;
  service: Service;
  flagStatus: FlagStatus;
  readingValue: number;
  previousValue: number | null;
  /** Consumption since the previous reading; null for a meter's first. */
  usage: number | null;
  /** This meter's own average consumption before this reading. */
  trailingAverage: number | null;
  capturedAt: string;
  photoUrl: string | null;
  notes: string | null;
}

// Module-level, not a component-body closure: Date.now() here is an event
// callback's concern, not render's, but the purity lint can't tell the two
// apart once a function is nested inside a component — keeping it top-level
// sidesteps that.
async function uploadEditPhoto(readingId: string, file: File): Promise<string> {
  const supabase = createClient();
  const ext = file.name.split(".").pop() || "jpg";
  const path = `review-edits/${readingId}-${Date.now()}.${ext}`;
  const { error: uploadError } = await supabase.storage.from("meter-photos").upload(path, file);
  if (uploadError) throw new Error(`Photo upload failed: ${uploadError.message}`);
  const { data: publicUrlData } = supabase.storage.from("meter-photos").getPublicUrl(path);
  return publicUrlData.publicUrl;
}

export function ReviewQueueList({ items }: { items: ReviewItem[] }) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [editPhoto, setEditPhoto] = useState<File | null>(null);
  const [editPhotoPreview, setEditPhotoPreview] = useState<string | null>(null);
  const [editError, setEditError] = useState<string | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [openBands, setOpenBands] = useState<Record<TriageBand, boolean>>({
    fix: BAND_META.fix.defaultOpen,
    look: BAND_META.look.defaultOpen,
    low: BAND_META.low.defaultOpen,
  });

  // The buzz fires on tap, not on completion: the action is a server round
  // trip, and by the time it resolves the gesture that authorised vibration
  // has expired on Android, so a success buzz would be silently dropped.
  function handle(action: (id: string) => Promise<void>, id: string, feedback: "success" | "warning") {
    haptic(feedback);
    setBusyId(id);
    startTransition(async () => {
      try {
        await action(id);
        router.refresh();
      } catch (err) {
        haptic("error");
        throw err; // still surfaces to the error boundary as before
      } finally {
        setBusyId(null);
      }
    });
  }

  function startEdit(item: ReviewItem) {
    haptic("tap");
    setEditingId(item.readingId);
    setEditValue(String(item.readingValue));
    setEditNotes(item.notes ?? "");
    setEditPhoto(null);
    setEditPhotoPreview(null);
    setEditError(null);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditPhoto(null);
    setEditPhotoPreview((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
  }

  function handleRetake(file: File | null) {
    setEditPhoto(file);
    setEditPhotoPreview((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return file ? URL.createObjectURL(file) : null;
    });
  }

  async function saveEdit(readingId: string) {
    setEditError(null);
    const value = Number.parseFloat(editValue);
    if (!editValue.trim() || Number.isNaN(value)) {
      setEditError("Enter a numeric reading.");
      return;
    }
    haptic("success");
    setSavingEdit(true);
    try {
      const photoUrl = editPhoto ? await uploadEditPhoto(readingId, editPhoto) : undefined;
      await editReading({ readingId, rawValue: editValue, notes: editNotes.trim() || null, photoUrl });
      cancelEdit();
      router.refresh();
    } catch (err) {
      haptic("error");
      setEditError(err instanceof Error ? err.message : "Failed to save changes");
    } finally {
      setSavingEdit(false);
    }
  }

  // Grouped by how much each reading actually matters, then by how badly it
  // distorts totals within its group — so the numbers corrupting reports sit
  // at the top rather than wherever their capture date happens to put them.
  const banded = useMemo(() => {
    const out: Record<TriageBand, { item: ReviewItem; triage: ReturnType<typeof triageReading> }[]> = {
      fix: [],
      look: [],
      low: [],
    };
    for (const item of items) {
      const triage = triageReading({
        flagStatus: item.flagStatus,
        usage: item.usage,
        trailingAverage: item.trailingAverage,
      });
      out[triage.band].push({ item, triage });
    }
    for (const band of BAND_ORDER) {
      out[band].sort(
        (a, b) => b.triage.weight - a.triage.weight || b.item.capturedAt.localeCompare(a.item.capturedAt)
      );
    }
    return out;
  }, [items]);

  if (items.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 py-16 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-50 text-green-700">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M4 12.5l5 5L20 6.5" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <p className="text-sm text-text-muted">Nothing waiting on you. All caught up.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-4 px-4 py-4">
      {BAND_ORDER.map((band) => {
        const entries = banded[band];
        if (entries.length === 0) return null;
        const meta = BAND_META[band];
        const isOpen = openBands[band];
        return (
          <section key={band}>
            <button
              type="button"
              onClick={() => setOpenBands((o) => ({ ...o, [band]: !o[band] }))}
              aria-expanded={isOpen}
              className="flex w-full items-center gap-2 py-1.5 text-left"
            >
              <span className="text-[13.5px] font-bold text-navy-900">{meta.title}</span>
              <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${meta.pill}`}>{entries.length}</span>
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                aria-hidden="true"
                className={`ml-auto text-text-faint transition-transform ${isOpen ? "rotate-180" : ""}`}
              >
                <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>

            {isOpen && (
              <>
                <p className="mb-2.5 text-[11.5px] leading-relaxed text-text-muted">{meta.blurb}</p>
                <div className="flex flex-col gap-3">
                  {entries.map(({ item, triage }) => {
                    const delta = item.previousValue !== null ? item.readingValue - item.previousValue : null;
                    const busy = busyId === item.readingId;
                    return (
          <div
            key={item.readingId}
            className={`flex flex-col gap-3 rounded-xl border border-l-[3px] border-border bg-surface p-4 ${meta.bar}`}
          >
            <p className="text-[12.5px] font-semibold text-navy-900">{triage.reason}</p>

            <div className="flex gap-3">
              {item.photoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={item.photoUrl} alt="" className="h-20 w-20 shrink-0 rounded-lg object-cover" />
              ) : (
                <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-lg bg-navy-900 text-white/40">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path d="M4 8.5A2.5 2.5 0 0 1 6.5 6h1L9 4h6l1.5 2h1A2.5 2.5 0 0 1 20 8.5v8A2.5 2.5 0 0 1 17.5 19h-11A2.5 2.5 0 0 1 4 16.5z" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13.5px] font-bold text-navy-900">
                  {item.unitNumber} · <span className="capitalize">{item.service}</span>
                </p>
                <p className="truncate text-[11px] text-text-muted">
                  {item.propertyName} · {formatDateTime(item.capturedAt)}
                </p>
                <div className="mt-1.5 flex items-baseline gap-2">
                  <span className="font-mono text-lg font-bold tabular-nums text-navy-900">
                    {item.readingValue.toLocaleString("en-US")}
                  </span>
                  {delta !== null && (
                    <span className={`font-mono text-xs font-semibold tabular-nums ${delta < 0 ? "text-red-600" : "text-amber-600"}`}>
                      {delta >= 0 ? "+" : ""}
                      {delta.toLocaleString("en-US")}
                    </span>
                  )}
                </div>
                {item.previousValue !== null && (
                  <p className="text-[10.5px] text-text-faint">was {item.previousValue.toLocaleString("en-US")}</p>
                )}
              </div>
            </div>

            {editingId === item.readingId ? (
              <div className="flex flex-col gap-3 rounded-xl border border-border-strong bg-app-bg p-3">
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    aria-label={editPhoto ? "Retake photo" : "Keep or retake photo"}
                    className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-navy-900"
                  >
                    {editPhotoPreview || item.photoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={editPhotoPreview ?? item.photoUrl!}
                        alt="Meter photo"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span className="flex h-full w-full items-center justify-center text-white/50">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                          <path
                            d="M4 8.5A2.5 2.5 0 0 1 6.5 6h1L9 4h6l1.5 2h1A2.5 2.5 0 0 1 20 8.5v8A2.5 2.5 0 0 1 17.5 19h-11A2.5 2.5 0 0 1 4 16.5z"
                            stroke="currentColor"
                            strokeWidth="1.6"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </span>
                    )}
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={(e) => handleRetake(e.target.files?.[0] ?? null)}
                  />
                  <div className="flex min-w-0 flex-1 flex-col justify-center gap-1">
                    <p className="text-[11px] text-text-muted">
                      {editPhoto ? "New photo attached" : "Keeping the original photo"}
                    </p>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="w-fit rounded-lg border border-border bg-surface px-2.5 py-1.5 text-[11px] font-semibold text-navy-900"
                    >
                      Retake photo
                    </button>
                  </div>
                </div>

                <label className="flex flex-col gap-1">
                  <span className="text-[11px] font-bold text-text-muted">Reading</span>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    className="w-full rounded-lg border border-border bg-surface px-3 py-2 font-mono text-sm outline-none focus:border-green-500"
                  />
                </label>

                <label className="flex flex-col gap-1">
                  <span className="text-[11px] font-bold text-text-muted">Note (optional)</span>
                  <textarea
                    value={editNotes}
                    onChange={(e) => setEditNotes(e.target.value)}
                    rows={2}
                    className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-green-500"
                  />
                </label>

                {editError && <p className="text-xs text-red-600">{editError}</p>}

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={cancelEdit}
                    disabled={savingEdit}
                    className="flex-1 rounded-xl border border-border-strong py-2.5 text-[13px] font-semibold text-navy-700 disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => saveEdit(item.readingId)}
                    disabled={savingEdit}
                    className="flex-1 rounded-xl bg-green-500 py-2.5 text-[13px] font-bold text-white disabled:opacity-50"
                  >
                    {savingEdit ? "Saving…" : "Save & mark reviewed"}
                  </button>
                </div>
              </div>
            ) : (
              <>
                {item.notes && <p className="rounded-lg bg-app-bg px-3 py-2 text-xs text-text-body">{item.notes}</p>}

                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => startEdit(item)}
                    className="flex-1 rounded-xl border border-blue-200 py-3 text-[13px] font-semibold text-blue-700 disabled:opacity-50"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => handle(acceptReading, item.readingId, "success")}
                    className="flex-1 rounded-xl bg-green-500 py-3 text-[13px] font-bold text-white disabled:opacity-50"
                  >
                    {busy ? "…" : "Accept"}
                  </button>
                </div>
              </>
            )}
          </div>
                    );
                  })}
                </div>
              </>
            )}
          </section>
        );
      })}
    </div>
  );
}
