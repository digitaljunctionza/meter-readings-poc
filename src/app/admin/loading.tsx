export default function AdminLoading() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col items-center justify-center gap-3 bg-white px-4 py-6">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-accent-light border-t-accent" />
      <p className="text-sm font-medium text-accent">Loading readings…</p>
    </main>
  );
}
