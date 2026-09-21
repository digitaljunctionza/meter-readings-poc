import { arcPath, dialTicks } from "@/components/charts/arcGeometry";

const SIZE = 168;
const CENTER = SIZE / 2;
const RADIUS = 62;
const STROKE = 13;
/** Angular breathing room between segments, as a fraction of the sweep. */
const GAP = 0.008;

export interface ArcSegment {
  key: string;
  label: string;
  value: number;
  color: string;
}

/**
 * The same dial the client dashboard uses, but divided by category instead of
 * carrying a needle — so the two sides of the app read as one instrument
 * family. The headline percentage sits in the dial's mouth, where a donut
 * would put its total.
 */
export function StatusArc({
  segments,
  centerValue,
  centerLabel,
  ariaLabel,
}: {
  segments: ArcSegment[];
  centerValue: string;
  centerLabel: string;
  ariaLabel: string;
}) {
  const total = segments.reduce((sum, s) => sum + s.value, 0);
  if (total <= 0) return null;

  const drawn = segments.map((segment, i) => {
    const before = segments.slice(0, i).reduce((sum, s) => sum + s.value, 0);
    const from = before / total;
    const to = (before + segment.value) / total;
    // Only inset a gap when there is a neighbour to separate from, and never
    // so much that a one-reading sliver disappears entirely.
    const inset = segments.length > 1 ? Math.min(GAP, (to - from) / 3) : 0;
    return { ...segment, d: arcPath(CENTER, CENTER, RADIUS, from + inset, to - inset) };
  });

  return (
    <svg
      viewBox={`0 0 ${SIZE} ${SIZE * 0.8}`}
      role="img"
      aria-label={ariaLabel}
      className="h-auto w-[150px] shrink-0 sm:w-[168px]"
    >
      {dialTicks(CENTER, CENTER, RADIUS).map((t, i) => (
        <line
          key={i}
          x1={t.x1}
          y1={t.y1}
          x2={t.x2}
          y2={t.y2}
          stroke={t.major ? "#94a3b8" : "#cbd5e1"}
          strokeWidth={t.major ? 1.6 : 1}
          strokeLinecap="round"
        />
      ))}

      <path
        d={arcPath(CENTER, CENTER, RADIUS, 0, 1)}
        fill="none"
        stroke="#eef2f7"
        strokeWidth={STROKE}
        strokeLinecap="round"
      />

      {drawn.map((segment) => (
        <path
          key={segment.key}
          d={segment.d}
          fill="none"
          stroke={segment.color}
          strokeWidth={STROKE}
          strokeLinecap="butt"
        />
      ))}

      <text
        x={CENTER}
        y={CENTER + 6}
        textAnchor="middle"
        fontSize="30"
        fontWeight="800"
        fill="#0c1f3d"
        className="font-mono tabular-nums"
      >
        {centerValue}
      </text>
      <text
        x={CENTER}
        y={CENTER + 24}
        textAnchor="middle"
        fontSize="10"
        fontWeight="700"
        fill="#64748b"
        letterSpacing="0.08em"
      >
        {centerLabel}
      </text>
    </svg>
  );
}
