import { LockIcon } from "@/components/icons";

/**
 * Deliberately visible placeholder for features on the roadmap (spec §6).
 * Kept in the UI rather than hidden so it can be pointed at during sales
 * demos to prospective body corporates.
 */
export function ComingSoon({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-dashed border-slate-300 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-500">
      <LockIcon className="h-3.5 w-3.5" />
      {label} — coming soon
    </span>
  );
}
