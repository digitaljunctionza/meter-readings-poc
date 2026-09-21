import { formatNumber } from "@/lib/clientReport";

/**
 * A number shown the way a meter shows it: one dark cell per digit, with the
 * unused leading places dimmed. It reads as "this is your meter" at a glance,
 * and the whole value is exposed to assistive tech as plain text.
 */
export function RegisterDigits({ value, unit }: { value: number; unit: string }) {
  const whole = Math.max(0, Math.round(value));
  const digits = String(whole).padStart(5, "0").split("");
  const firstSignificant = whole === 0 ? digits.length - 1 : digits.findIndex((d) => d !== "0");
  const compact = digits.length > 7;

  return (
    <div role="img" aria-label={`${formatNumber(whole)} ${unit}`} className="flex items-stretch">
      {digits.map((digit, i) => {
        const fromRight = digits.length - i;
        const groupGap = i > 0 && fromRight % 3 === 0;
        return (
          <span
            key={i}
            aria-hidden="true"
            className={`flex items-center justify-center rounded-md bg-navy-900 font-mono font-bold tabular-nums shadow-[inset_0_-2px_0_rgba(255,255,255,0.08)] ${
              compact
                ? "h-9 w-[1.45rem] text-lg sm:h-10 sm:w-[1.65rem] sm:text-xl"
                : "h-11 w-8 text-xl sm:h-12 sm:w-9 sm:text-2xl"
            } ${groupGap ? "ml-1.5 sm:ml-2" : i > 0 ? "ml-[3px]" : ""} ${i < firstSignificant ? "text-white/25" : "text-white"}`}
          >
            {digit}
          </span>
        );
      })}
    </div>
  );
}
