/** Vertical fade used to fill bars — full colour at the top, airy at the base. */
export function BarGradient({ id, color }: { id: string; color: string }) {
  return (
    <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stopColor={color} stopOpacity={0.95} />
      <stop offset="100%" stopColor={color} stopOpacity={0.42} />
    </linearGradient>
  );
}

// Recharts v3 reads `active`/`payload`/`label` from context rather than
// declaring them on TooltipProps, so the content component's props are typed
// here against what it is actually handed at runtime.
interface TooltipContentProps {
  active?: boolean;
  payload?: { name?: string | number; value?: number | string }[];
  label?: string | number;
  suffix?: string;
  labelFormatter?: (label: string) => string;
}

/**
 * Replaces recharts' default white box, which ignores the app's type and
 * corner radius and looks borrowed from another product.
 */
export function ChartTooltip({ active, payload, label, suffix = "", labelFormatter }: TooltipContentProps) {
  if (!active || !payload?.length) return null;
  const heading = String(label ?? payload[0]?.name ?? "");
  return (
    <div className="rounded-xl border border-slate-200 bg-white/95 px-3 py-2 shadow-lg backdrop-blur-sm">
      <p className="text-[11px] font-semibold tracking-wide text-slate-500 uppercase">
        {labelFormatter ? labelFormatter(heading) : heading}
      </p>
      {payload.map((entry, i) => (
        <p key={i} className="font-mono text-sm font-bold tabular-nums text-navy-900">
          {Number(entry.value).toLocaleString("en-US")}
          {suffix && <span className="ml-1 font-sans text-xs font-semibold text-slate-500">{suffix}</span>}
        </p>
      ))}
    </div>
  );
}
