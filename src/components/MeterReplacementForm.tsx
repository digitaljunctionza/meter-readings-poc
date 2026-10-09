"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/browser";
import { formatDate } from "@/lib/date";
import { recordReplacement } from "@/app/capture/[propertyId]/[meterId]/replace/actions";
import type { Service } from "@/lib/types";

const FIELD =
  "h-[50px] w-full min-w-0 rounded-xl border-[1.5px] border-border-strong bg-surface px-3.5 text-navy-900 outline-none focus:border-navy-700 focus:ring-2 focus:ring-navy-700/15";

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
    <>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => pick(e.target.files?.[0] ?? null)}
      />
      {preview && file ? (
        <div className="flex items-center gap-3 rounded-xl border border-green-200 p-2.5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={preview} alt={`${label} photo`} className="h-12 w-12 shrink-0 rounded-lg object-cover" />
          <span className="flex-1 text-sm font-bold text-[#2e6b1d]">{label} photo attached</span>
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="min-h-11 rounded-xl border border-border-strong px-3 text-sm font-bold text-navy-700 hover:bg-app-bg"
          >
            Retake
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="flex min-h-12 items-center justify-center gap-2 rounded-xl border-2 border-dashed border-[#9fb3cc] bg-[#f7f9fb] text-[15px] font-bold text-navy-700 hover:border-navy-700"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M4 8h3l2-3h6l2 3h3v11H4z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
            <circle cx="12" cy="13" r="3.5" stroke="currentColor" strokeWidth="2" />
          </svg>
          Take photo of {label.toLowerCase()}
        </button>
      )}
    </>
  );
}

function StepHeading({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-navy-900 font-mono text-[13px] font-bold text-white">{n}</span>
      <h2 className="text-base font-bold text-navy-900">{children}</h2>
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

  const title = unitNumber ? `Unit ${unitNumber} · ${service === "water" ? "Water" : "Electricity"}` : propertyName;

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col bg-app-bg">
      <header className="flex-none border-b border-border bg-surface px-4 pb-4 pt-[calc(env(safe-area-inset-top)+16px)]">
        <div className="flex items-center gap-3">
          <Link
            href={`/capture/${propertyId}`}
            aria-label="Cancel replacement"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-border hover:bg-app-bg"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M6 6l12 12M18 6L6 18" stroke="var(--navy-900)" strokeWidth="2.2" strokeLinecap="round" />
            </svg>
          </Link>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] text-[#5d6c80]">{title}</p>
            <h1 className="truncate text-xl font-extrabold text-navy-900">Replace this meter</h1>
          </div>
        </div>
      </header>

      <div className="flex flex-1 flex-col gap-3 overflow-y-auto px-4 py-4">
        <p className="text-sm leading-relaxed text-text-body">
          Record the old meter&apos;s last reading and the new meter&apos;s first reading, so usage stays correct.
        </p>

        <section className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-4">
          <StepHeading n={1}>Old meter · final reading</StepHeading>
          <p className="text-[13px] text-[#5d6c80]">
            {oldSerial ? `Serial ${oldSerial}` : "No serial on record"}
            {lastReadingValue !== null && (
              <>
                {" "}
                · last{" "}
                <strong className="font-mono font-bold text-navy-900 tabular-nums">{lastReadingValue.toLocaleString("en-US")}</strong>
                {lastReadingDate ? ` on ${formatDate(lastReadingDate)}` : ""}
              </>
            )}
          </p>
          <label className="flex flex-col gap-1.5 text-sm font-semibold text-navy-900">
            Final reading
            <input
              type="text"
              inputMode="decimal"
              placeholder={lastReadingValue !== null ? `More than ${lastReadingValue.toLocaleString("en-US")}` : "Final reading"}
              value={closingValue}
              onChange={(e) => setClosingValue(e.target.value)}
              className={`${FIELD} font-mono text-lg font-bold tabular-nums placeholder:font-sans placeholder:text-[15px] placeholder:font-normal placeholder:text-text-faint`}
            />
          </label>
          <PhotoPicker label="Old dial" file={closingPhoto} onChange={setClosingPhoto} />
        </section>

        <section className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-4">
          <StepHeading n={2}>New meter · opening reading</StepHeading>
          <div className="grid grid-cols-2 gap-2.5">
            <label className="flex min-w-0 flex-col gap-1.5 text-sm font-semibold text-navy-900">
              Opening
              <input
                type="text"
                inputMode="decimal"
                value={openingValue}
                onChange={(e) => setOpeningValue(e.target.value)}
                className={`${FIELD} font-mono text-lg font-bold tabular-nums`}
              />
            </label>
            <label className="flex min-w-0 flex-col gap-1.5 text-sm font-semibold text-navy-900">
              Serial (optional)
              <input type="text" value={newSerial} onChange={(e) => setNewSerial(e.target.value)} className={`${FIELD} text-[15px]`} />
            </label>
          </div>
          <PhotoPicker label="New dial" file={openingPhoto} onChange={setOpeningPhoto} />
        </section>

        <div className="rounded-2xl bg-[#e8eef7] px-4 py-3 text-[13px] leading-relaxed text-navy-700">
          <strong>What the client sees:</strong> a &ldquo;meter replaced&rdquo; note in their readings and report, so the drop
          from {closingValue || "…"} to {openingValue || "0"} reads as a swap, not as usage.
        </div>

        <label className="flex flex-col gap-1.5 text-sm font-semibold text-navy-900">
          Note (optional)
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            placeholder="e.g. Replaced by the municipality"
            className="w-full rounded-xl border-[1.5px] border-border-strong bg-surface px-3.5 py-2.5 text-[15px] font-normal text-navy-900 outline-none placeholder:text-text-faint focus:border-navy-700"
          />
        </label>

        {error && (
          <p role="alert" className="rounded-xl border border-red-600/30 bg-red-600/[0.06] px-3.5 py-2.5 text-sm font-medium text-red-600">
            {error}
          </p>
        )}
      </div>

      <div className="sticky bottom-0 flex-none border-t border-border bg-surface px-4 pb-[calc(env(safe-area-inset-bottom)+16px)] pt-3">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!ready || submitting}
          className="min-h-14 w-full rounded-2xl bg-navy-700 text-base font-bold text-white transition-colors hover:bg-navy-900 disabled:bg-border disabled:text-[#5d6c80]"
        >
          {submitting ? "Recording…" : ready ? "Record replacement" : "Add both readings and photos"}
        </button>
      </div>
    </main>
  );
}
