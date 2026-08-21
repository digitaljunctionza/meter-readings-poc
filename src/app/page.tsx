import Image from "next/image";
import Link from "next/link";
import { ExitGuard } from "@/components/ExitGuard";
import { getProfile } from "@/lib/auth";

export default async function Home() {
  const profile = await getProfile();

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col items-center justify-center gap-8 bg-white px-6 py-8 text-center">
      <ExitGuard />
      <Image src="/logo-full.png" alt="Wayne's Fix and Finish" width={280} height={280} priority />

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

        {profile?.role === "client" && (
          <Link
            href="/client"
            className="rounded-full bg-accent px-4 py-4 text-base font-semibold text-white"
          >
            View my property
          </Link>
        )}
      </div>
    </main>
  );
}
