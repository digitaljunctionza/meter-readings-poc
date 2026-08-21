// Pure CSS animation, no client JS: this must fade itself out and stop
// blocking taps even if the JS bundle is slow to load/hydrate on a real
// phone/network — a JS-timer-driven splash can get stuck fully covering
// the screen forever if hydration never completes. Plain <img>, not
// next/image, so the icon paints straight from the server-rendered HTML
// with zero dependency on JS ever running.
export function SplashScreen() {
  return (
    <div className="splash-screen fixed inset-0 z-50 flex flex-col items-center justify-center gap-3 bg-navy-900">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/icons/source-icon.png" alt="" width={72} height={72} className="rounded-2xl" />
      <p className="text-sm font-semibold text-white">Meter Readings</p>
    </div>
  );
}
