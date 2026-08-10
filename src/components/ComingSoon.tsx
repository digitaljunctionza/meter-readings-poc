/**
 * Deliberately visible placeholder for features on the roadmap (spec §6).
 * Kept in the UI rather than hidden so it can be pointed at during sales
 * demos to prospective body corporates.
 */
export function ComingSoon({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border-2 border-dashed border-gray-300 px-3 py-1 text-xs font-medium text-gray-500">
      <span aria-hidden="true">🔒</span>
      {label} — coming soon
    </span>
  );
}
