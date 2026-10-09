import type { ReactNode } from "react";

/** Page frame for admin screens: phone-width column on mobile, and on
 * desktop the space to the right of BottomNav's sidebar (w-64), either a
 * reading column or the full working width. Pages still render BottomNav
 * themselves so each can pass its own call to action. */
export function AdminPage({
  children,
  width = "narrow",
}: {
  children: ReactNode;
  width?: "narrow" | "wide";
}) {
  return (
    <div className="min-h-screen bg-app-bg lg:pl-64">
      <main
        className={`mx-auto flex min-h-screen w-full max-w-md flex-col pb-32 lg:pb-12 lg:pt-8 ${
          width === "wide" ? "lg:max-w-6xl lg:px-8" : "lg:max-w-2xl"
        }`}
      >
        {children}
      </main>
    </div>
  );
}
