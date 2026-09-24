"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/browser";
import { formatDate } from "@/lib/date";
import { recordReplacement } from "@/app/capture/[propertyId]/[meterId]/replace/actions";
import type { Service } from "@/lib/types";

function PhotoPicker({
  label,
  file,
  onChange,
}: {
  label: string;
  file: File | null;
  onChange: (f: File | null) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);

  function pick(f: File | null) {
    onChange(f);
    setPreview((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return f ? URL.createObjectURL(f) : null;
    });
  }

  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-navy-900"
      >
        {preview && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt="" className="h-full w-full object-cover" />
        )}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => pick(e.target.files?.[0] ?? null)}
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className={`flex min-h-[40px] items-center gap-1.5 text-xs font-medium ${file ? "text-green-700" : "text-blue-500"}`}
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          {file ? (
            <path d="M4 12.5l5 5L20 6.5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
          ) : (
            <path
              d="M4 8.5A2.5 2.5 0 0 1 6.5 6h1L9 4h6l1.5 2h1A2.5 2.5 0 0 1 20 8.5v8A2.5 2.5 0 0 1 17.5 19h-11A2.5 2.5 0 0 1 4 16.5z"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}
        </svg>
        {file ? `${label} attached` : `Add photo of ${label.toLowerCase()}`}
      </button>
    </div>
  );
}

export function MeterReplacementForm({
  propertyId,
  propertyName,
  oldMeterId,
  unitNumber,
  service,
  oldSerial,
  lastReadingValue,
  lastReadingDate,
}: {
  propertyId: string;
  propertyName: string;
  oldMeterId: string;
  unitNumber: string | null;
  service: Service;
  oldSerial: string | null;
  lastReadingValue: number | null;
  lastReadingDate: string | null;
}) {
  const router = useRouter();
  const [closingValue, setClosingValue] = useState("");
  const [closingPhoto, setClosingPhoto] = useState<File | null>(null);
  const [newSerial, setNewSerial] = useState("");
  const [openingValue, setOpeningValue] = useState("0");
  const [openingPhoto, setOpeningPhoto] = useState<File | null>(null);
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ready = !!(closingValue && closingPhoto && openingValue !== "" && openingPhoto);

  async function handleSubmit() {
    setError(null);
    if (!ready) {
      setError("Both readings and both photos are required.");
      return;
    }
    setSubmitting(true);
    try {
      const supabase = createClient();
      async function upload(file: File, tag: string) {
        const ext = file.name.split(".").pop() || "jpg";
        const path = `${propertyId}/${oldMeterId}-${tag}-${Date.now()}.${ext}`;
        const { error: uploadError } = await supabase.storage.from("meter-photos").upload(path, file);
        if (uploadError) throw new Error(`Photo upload failed: ${uploadError.message}`);
        return supabase.storage.from("meter-photos").getPublicUrl(path).data.publicUrl;
      }

      const [closingPhotoUrl, openingPhotoUrl] = await Promise.all([
        upload(closingPhoto!, "closing"),
        upload(openingPhoto!, "opening"),
      ]);

      await recordReplacement({
        oldMeterId,
        closingValue: Number.parseFloat(closingValue),
        closingPhotoUrl,
        newSerial: newSerial.trim() || null,
        openingValue: Number.parseFloat(openingValue),
        openingPhotoUrl,
        note: note.trim() || null,
        propertyId,
      });

      router.push(`/capture/${propertyId}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
      setSubmitting(false);
    }
  }

  const title = unitNumber ? `Unit ${unitNumber} · ${service === "water" ? "Water" : "Electricity"}` : "Meter replacement";

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col bg-app-bg">
      <div className="flex-none bg-navy-700 px-5 pb-4 pt-[calc(env(safe-area-inset-top)+14px)] text-white">
        <div className="flex items-center gap-3">
          <Link
            href={`/capture/${propertyId}`}
            aria-label="Cancel replacement"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/20"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M15 5l-7 7 7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Link>
          <div className="min-w-0 flex-1">
            <p className="font-mono text-[10px] font-medium tracking-[0.08em] text-green-500">METER REPLACEMENT</p>
            <p className="truncate text-lg font-bold">{title}</p>
          </div>
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-3 overflow-y-auto px-4 py-4">
        <div className="rounded-xl border border-border bg-surface p-4">
          <div className="flex items-center gap-2 pb-3">
            <span className="flex h-[22px] w-[22px] items-center justify-center rounded-full bg-divider font-mono text-[11px] font-bold text-text-muted">1</span>
            <span className="text-[13px] font-semibold text-navy-900">Old meter, final reading</span>
          </div>
          <div className="flex flex-col gap-3 border-t border-divider pt-3">
            <p className="text-[11px] text-text-muted">
              {oldSerial ? `Serial ${oldSerial}` : "No serial on record"}
              {lastReadingValue !== null && (
                <> · last {lastReadingValue.toLocaleString("en-US")}{lastReadingDate ? ` on ${formatDate(lastReadingDate)}` : ""}</>
              )}
            </p>
            <input
              type="text"
              inputMode="decimal"
              placeholder="Final reading"
              value={closingValue}
              onChange={(e) => setClosingValue(e.target.value)}
              className="w-full border-b-2 border-navy-700 bg-transparent pb-2 font-mono text-2xl font-bold text-navy-900 outline-none tabular-nums placeholder:text-text-faint"
            />
            <PhotoPicker label="Old dial" file={closingPhoto} onChange={setClosingPhoto} />
          </div>
        </div>

        <div className="rounded-xl border border-border bg-surface p-4">
          <div className="flex items-center gap-2 pb-3">
            <span className="flex h-[22px] w-[22px] items-center justify-center rounded-full bg-green-500 font-mono text-[11px] font-bold text-white">2</span>
            <span className="text-[13px] font-semibold text-navy-900">New meter, opening reading</span>
          </div>
          <div className="flex flex-col gap-3 border-t border-divider pt-3">
            <div className="grid grid-cols-2 gap-2">
              <label className="flex flex-col gap-1 rounded-lg border border-border px-2.5 py-2">
                <span className="font-mono text-[9px] font-medium text-text-muted">SERIAL (OPTIONAL)</span>
                <input
                  type="text"
                  value={newSerial}
                  onChange={(e) => setNewSerial(e.target.value)}
                  className="w-full bg-transparent font-mono text-[13px] font-semibold text-navy-900 outline-none"
                />
              </label>
              <label className="flex flex-col gap-1 rounded-lg border border-green-500 px-2.5 py-2">
                <span className="font-mono text-[9px] font-medium text-text-muted">OPENING</span>
                <input
                  type="text"
                  inputMode="decimal"
                  value={openingValue}
                  onChange={(e) => setOpeningValue(e.target.value)}
                  className="w-full bg-transparent font-mono text-[13px] font-semibold text-navy-900 outline-none tabular-nums"
                />
              </label>
            </div>
            <PhotoPicker label="New dial" file={openingPhoto} onChange={setOpeningPhoto} />
          </div>
        </div>

        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3.5 text-[11.5px] leading-relaxed text-amber-800">
          <b className="text-amber-900">What the client will see.</b> A marker row at this changeover in their
          report, so the drop from {closingValue || "…"} to {openingValue || "0"} reads as a swap, not as usage.
        </div>

        <label className="flex flex-col gap-1.5">
          <span className="font-mono text-[10px] font-medium tracking-[0.08em] text-text-muted">NOTE (OPTIONAL)</span>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-navy-900 outline-none focus:border-green-500"
          />
        </label>

        {error && <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p>}
      </div>

      <div className="flex-none border-t border-border bg-surface px-5 pb-[calc(env(safe-area-inset-bottom)+14px)] pt-3">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!ready || submitting}
          className="min-h-[54px] w-full rounded-2xl bg-green-500 text-[15px] font-bold text-white transition-opacity disabled:opacity-50"
        >
          {submitting ? "Recording…" : "Record replacement"}
        </button>
      </div>
    </main>
  );
}
