import { LockIcon } from "@/components/icons";

/**
 * Deliberately visible placeholder for features on the roadmap (spec §6).
 * Kept in the UI rather than hidden so it can be pointed at during sales
 * demos to prospective body corporates.
 */
export function ComingSoon({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-dashed border-border-strong bg-app-bg px-3 py-1 text-xs font-medium text-[#5d6c80]">
      <LockIcon className="h-3.5 w-3.5" />
      {label} — coming soon
    </span>
  );
}
