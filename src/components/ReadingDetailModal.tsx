"use client";

import { Modal } from "@/components/Modal";
import type { ReadingRow } from "@/components/ReadingsTable";
import { ADMIN_FLAG_LABEL, FLAG_CLASS, FLAG_DOT_CLASS, TONE_CLASS } from "@/lib/flagDisplay";
import {
  clientStatus,
  formatDayTime,
  formatNumber,
  isService,
  SERVICE_LABEL,
  SERVICE_UNIT,
  unitTitle,
} from "@/lib/clientReport";
import { formatDateTime } from "@/lib/date";

/**
 * One reading in full. Admins see the internal flag wording and the meter
 * reader's note; clients see plain language and never the note (it is written
 * to Wayne, not to them).
 */
export function ReadingDetailModal({
  row,
  onClose,
  audience = "admin",
  openIssue = false,
}: {
  row: ReadingRow;
  onClose: () => void;
  audience?: "admin" | "client";
  /** Client view only: this is a meter's latest reading and it is still being checked. */
  openIssue?: boolean;
}) {
  return audience === "client" ? (
    <ClientDetail row={row} onClose={onClose} openIssue={openIssue} />
  ) : (
    <AdminDetail row={row} onClose={onClose} />
  );
}

function Photo({ url }: { url: string | null }) {
  return url ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={url}
      alt="Meter photo"
      className="max-h-[50vh] w-full rounded-xl border border-slate-200 bg-slate-50 object-contain"
    />
  ) : (
    <div className="flex h-40 items-center justify-center rounded-xl border border-dashed border-slate-200 text-sm text-slate-400">
      No photo attached
    </div>
  );
}

function PhotoLink({ url }: { url: string | null }) {
  if (!url) return null;
  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      className="w-fit text-sm font-medium text-accent underline decoration-accent-light underline-offset-2 hover:decoration-accent"
    >
      Open full-size photo in a new tab
    </a>
  );
}

function AdminDetail({ row, onClose }: { row: ReadingRow; onClose: () => void }) {
  return (
    <Modal title={`${row.unit_number} · ${row.service}`} onClose={onClose}>
      <div className="flex flex-col gap-4">
        <Photo url={row.photo_url} />

        <span
          className={`inline-flex w-fit items-center gap-1.5 rounded-full border bg-white px-2.5 py-1 text-xs font-medium ${FLAG_CLASS[row.flag_status]}`}
        >
          <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${FLAG_DOT_CLASS[row.flag_status]}`} aria-hidden="true" />
          {ADMIN_FLAG_LABEL[row.flag_status]}
        </span>

        <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
          <div>
            <dt className="text-xs text-slate-500">Captured</dt>
            <dd className="font-medium text-slate-900">{formatDateTime(row.captured_at)}</dd>
          </div>
          <div>
            <dt className="text-xs text-slate-500">Reading</dt>
            <dd className="font-mono font-semibold tabular-nums text-slate-900">
              {row.reading_value.toLocaleString("en-US")}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-slate-500">Previous</dt>
            <dd className="font-mono tabular-nums text-slate-700">
              {row.previous_value !== null ? row.previous_value.toLocaleString("en-US") : "—"}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-slate-500">Usage</dt>
            <dd className="font-mono tabular-nums text-slate-700">
              {row.usage !== null ? row.usage.toLocaleString("en-US") : "—"}
            </dd>
          </div>
        </dl>

        {row.notes && <p className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700">{row.notes}</p>}

        <PhotoLink url={row.photo_url} />
      </div>
    </Modal>
  );
}

function ClientDetail({
  row,
  onClose,
  openIssue,
}: {
  row: ReadingRow;
  onClose: () => void;
  openIssue: boolean;
}) {
  const known = isService(row.service);
  const unit = known ? SERVICE_UNIT[row.service as keyof typeof SERVICE_UNIT] : "";
  const serviceLabel = known ? SERVICE_LABEL[row.service as keyof typeof SERVICE_LABEL] : row.service;
  const status = clientStatus(row, openIssue);
  const tone = TONE_CLASS[status.tone];

  let usageLine: string;
  if (row.usage === null) usageLine = "This is the first reading recorded for this meter.";
  else if (row.usage < 0) {
    usageLine = `Lower than the previous reading${row.previous_value !== null ? ` (${formatNumber(row.previous_value)} ${unit})` : ""}.`;
  } else usageLine = `Used ${formatNumber(row.usage)} ${unit} since the previous reading.`;

  return (
    <Modal title={`${unitTitle(row.unit_number)} · ${serviceLabel}`} onClose={onClose}>
      <div className="flex flex-col gap-4">
        <Photo url={row.photo_url} />

        <div>
          <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">Meter reading</p>
          <p className="mt-1 font-mono text-3xl font-bold tabular-nums text-navy-900">
            {formatNumber(row.reading_value)}{" "}
            <span className="font-sans text-base font-semibold text-slate-500">{unit}</span>
          </p>
          <p className="mt-1 text-sm text-slate-600">{usageLine}</p>
        </div>

        <span
          className={`inline-flex w-fit items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${tone.pill}`}
        >
          <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${tone.dot}`} aria-hidden="true" />
          {status.label}
        </span>
        {status.detail && (
          <p className="rounded-xl bg-slate-50 px-3 py-2.5 text-sm text-slate-700">{status.detail}</p>
        )}

        <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
          <div>
            <dt className="text-xs text-slate-500">Reading taken</dt>
            <dd className="font-medium text-slate-900">{formatDayTime(row.captured_at)}</dd>
          </div>
          <div>
            <dt className="text-xs text-slate-500">Previous reading</dt>
            <dd className="font-mono tabular-nums text-slate-700">
              {row.previous_value !== null ? `${formatNumber(row.previous_value)} ${unit}` : "None yet"}
            </dd>
          </div>
        </dl>

        <PhotoLink url={row.photo_url} />
      </div>
    </Modal>
  );
}
