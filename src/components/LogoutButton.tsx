"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/browser";
import { LogoutIcon } from "@/components/icons";

export function LogoutButton({ className }: { className?: string }) {
  const router = useRouter();

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <button type="button" onClick={handleLogout} className={className}>
      <span className="inline-flex items-center gap-1.5">
        <LogoutIcon className="h-4 w-4" />
        <span>Log out</span>
      </span>
    </button>
  );
}
