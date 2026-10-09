export default function AdminLoading() {
  return (
    <div className="flex min-h-screen w-full flex-col items-center justify-center gap-3 bg-app-bg px-4 py-6 lg:pl-64">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-border border-t-navy-700" />
      <p role="status" className="text-[15px] font-semibold text-navy-700">
        Loading…
      </p>
    </div>
  );
}
