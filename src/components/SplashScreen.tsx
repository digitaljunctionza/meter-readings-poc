// Pure CSS animation, no client JS: this must fade itself out and stop
// blocking taps even if the JS bundle is slow to load/hydrate on a real
// phone/network — a JS-timer-driven splash can get stuck fully covering
// the screen forever if hydration never completes.
export function SplashScreen() {
  return (
    <div className="splash-screen fixed inset-0 z-50 flex flex-col items-center justify-center gap-3 bg-accent">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white text-2xl font-bold text-accent">
        M
      </div>
      <p className="text-sm font-semibold text-white">Meter Readings</p>
    </div>
  );
}
