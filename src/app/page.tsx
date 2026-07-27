import Link from "next/link";
import { ExitGuard } from "@/components/ExitGuard";
import { getProfile } from "@/lib/auth";

export default async function Home() {
  const profile = await getProfile();

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col items-center justify-center gap-8 bg-white px-6 py-8 text-center">
      <ExitGuard />
      <div className="w-full overflow-hidden rounded-2xl border-2 border-accent">
        <div className="bg-accent px-4 py-3 text-left text-sm font-bold text-white">
          Meter Readings
        </div>
        <div className="flex flex-col items-center gap-1 px-6 py-8">
          <h1 className="text-xl font-bold text-accent">Wayne&apos;s Fix &amp; Finish</h1>
          <p className="text-sm text-gray-500">Electricity &amp; water meter tracking</p>
        </div>
      </div>

      <div className="flex w-full flex-col gap-3">
        {!profile && (
          <Link
            href="/login"
            className="rounded-full bg-accent px-4 py-4 text-base font-semibold text-white"
          >
            Log in
          </Link>
        )}

        {profile?.role === "admin" && (
          <>
            <Link
              href="/capture"
              className="rounded-full bg-accent px-4 py-4 text-base font-semibold text-white"
            >
              Capture a reading
            </Link>
            <Link
              href="/admin"
              className="rounded-full border-2 border-accent px-4 py-4 text-base font-semibold text-accent"
            >
              Admin: view reports
            </Link>
          </>
        )}

        {profile?.role === "owner" && (
          <Link
            href="/owner"
            className="rounded-full bg-accent px-4 py-4 text-base font-semibold text-white"
          >
            View my property
          </Link>
        )}
      </div>
    </main>
  );
}
