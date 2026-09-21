const SIZE = 124;
const CENTER = SIZE / 2;
const RADIUS = 47;
const STROKE = 9;
const START = 150; // lower-left, sweeping clockwise over the top
const SWEEP = 240;
/** Full-scale is twice a usual month, so "usual" sits dead centre on the dial. */
const SCALE_MAX = 2;

/**
 * Coordinates are rounded to 2dp because Math.cos/sin can disagree in the
 * final float digit between Node and the browser — enough to trip React's
 * hydration check on every tick mark.
 */
function polar(r: number, deg: number) {
  const rad = (deg * Math.PI) / 180;
  return {
    x: Math.round((CENTER + r * Math.cos(rad)) * 100) / 100,
    y: Math.round((CENTER + r * Math.sin(rad)) * 100) / 100,
  };
}

function arcPath(r: number, fromT: number, toT: number): string {
  const a0 = START + SWEEP * fromT;
  const a1 = START + SWEEP * toT;
  const p0 = polar(r, a0);
  const p1 = polar(r, a1);
  return `M ${p0.x} ${p0.y} A ${r} ${r} 0 ${a1 - a0 > 180 ? 1 : 0} 1 ${p1.x} ${p1.y}`;
}

export type GaugeTone = "low" | "normal" | "high" | "veryHigh";

const TONE: Record<GaugeTone, { from: string; to: string; text: string }> = {
  low: { from: "#4ade80", to: "#16a34a", text: "#15803d" },
  normal: { from: "#86d36a", to: "#58a93b", text: "#3f7f27" },
  high: { from: "#fbbf24", to: "#f59e0b", text: "#b45309" },
  veryHigh: { from: "#fb7185", to: "#e11d48", text: "#be123c" },
};

export function gaugeTone(ratio: number): GaugeTone {
  if (ratio < 0.9) return "low";
  if (ratio <= 1.15) return "normal";
  if (ratio <= 1.5) return "high";
  return "veryHigh";
}

/**
 * A dial that answers one question: is this month normal? The needle sits
 * mid-dial at a usual month, so "further right than the middle" reads as
 * "using more" without anyone needing the numbers. Pure SVG — no chart
 * library, so it stays crisp at any size and animates with plain CSS.
 */
export function ArcGauge({
  ratio,
  centerLabel,
  caption,
  ariaLabel,
}: {
  /** This month ÷ a usual month. 1 = exactly usual. */
  ratio: number;
  centerLabel: string;
  caption: string;
  ariaLabel: string;
}) {
  const clamped = Math.max(0, Math.min(SCALE_MAX, ratio));
  const t = clamped / SCALE_MAX;
  const tone = TONE[gaugeTone(ratio)];
  const pinned = ratio > SCALE_MAX;
  const needle = polar(RADIUS - 15, START + SWEEP * t);
  const gradientId = `gauge-${tone.from.slice(1)}`;

  return (
    <div className="flex shrink-0 flex-col items-center gap-1">
      <svg
        viewBox={`0 0 ${SIZE} ${SIZE * 0.78}`}
        role="img"
        aria-label={ariaLabel}
        className="h-auto w-[104px] overflow-visible sm:w-[124px]"
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="1" x2="1" y2="0">
            <stop offset="0%" stopColor={tone.from} />
            <stop offset="100%" stopColor={tone.to} />
          </linearGradient>
        </defs>

        {/* Dial ticks — denser marks read as a measuring instrument, not a progress bar. */}
        {Array.from({ length: 25 }, (_, i) => {
          const major = i % 6 === 0;
          const p1 = polar(RADIUS + 7, START + SWEEP * (i / 24));
          const p2 = polar(RADIUS + (major ? 12 : 10), START + SWEEP * (i / 24));
          return (
            <line
              key={i}
              x1={p1.x}
              y1={p1.y}
              x2={p2.x}
              y2={p2.y}
              stroke={major ? "#94a3b8" : "#cbd5e1"}
              strokeWidth={major ? 1.6 : 1}
              strokeLinecap="round"
            />
          );
        })}

        <path d={arcPath(RADIUS, 0, 1)} fill="none" stroke="#e8edf4" strokeWidth={STROKE} strokeLinecap="round" />

        <path
          d={arcPath(RADIUS, 0, Math.max(t, 0.012))}
          fill="none"
          stroke={`url(#${gradientId})`}
          strokeWidth={STROKE}
          strokeLinecap="round"
          className="[stroke-dasharray:1000] [stroke-dashoffset:1000] motion-safe:animate-[gauge-sweep_900ms_cubic-bezier(0.22,1,0.36,1)_forwards] motion-reduce:[stroke-dashoffset:0]"
        />

        {/* The "usual month" mark at mid-dial, which is what the needle is read against. */}
        <line
          x1={polar(RADIUS - STROKE / 2 - 1, START + SWEEP * 0.5).x}
          y1={polar(RADIUS - STROKE / 2 - 1, START + SWEEP * 0.5).y}
          x2={polar(RADIUS + STROKE / 2 + 1, START + SWEEP * 0.5).x}
          y2={polar(RADIUS + STROKE / 2 + 1, START + SWEEP * 0.5).y}
          stroke="#0c1f3d"
          strokeWidth={2}
          strokeLinecap="round"
        />

        <line
          x1={CENTER}
          y1={CENTER}
          x2={needle.x}
          y2={needle.y}
          stroke="#0c1f3d"
          strokeWidth={2.5}
          strokeLinecap="round"
        />
        <circle cx={CENTER} cy={CENTER} r={4.5} fill="#0c1f3d" />
        {pinned && (
          <text x={SIZE - 6} y={CENTER + 18} textAnchor="end" fontSize="9" fontWeight="700" fill={tone.text}>
            off scale
          </text>
        )}

        <text
          x={CENTER}
          y={CENTER + 24}
          textAnchor="middle"
          fontSize="17"
          fontWeight="800"
          fill={tone.text}
          className="font-mono tabular-nums"
        >
          {centerLabel}
        </text>
      </svg>
      <p className="text-[11px] font-semibold text-slate-500">{caption}</p>
    </div>
  );
}
