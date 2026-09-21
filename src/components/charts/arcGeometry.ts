/** Shared dial geometry, so every arc in the app reads as the same instrument. */

export const ARC_START = 150; // lower-left, sweeping clockwise over the top
export const ARC_SWEEP = 240;

/**
 * Coordinates are rounded to 2dp because Math.cos/sin can disagree in the
 * final float digit between Node and the browser — enough to trip React's
 * hydration check on every tick mark.
 */
export function polarPoint(cx: number, cy: number, r: number, deg: number) {
  const rad = (deg * Math.PI) / 180;
  return {
    x: Math.round((cx + r * Math.cos(rad)) * 100) / 100,
    y: Math.round((cy + r * Math.sin(rad)) * 100) / 100,
  };
}

/** `fromT`/`toT` are 0–1 along the dial's sweep. */
export function arcPath(cx: number, cy: number, r: number, fromT: number, toT: number): string {
  const a0 = ARC_START + ARC_SWEEP * fromT;
  const a1 = ARC_START + ARC_SWEEP * toT;
  const p0 = polarPoint(cx, cy, r, a0);
  const p1 = polarPoint(cx, cy, r, a1);
  return `M ${p0.x} ${p0.y} A ${r} ${r} 0 ${a1 - a0 > 180 ? 1 : 0} 1 ${p1.x} ${p1.y}`;
}

export interface DialTick {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  major: boolean;
}

export function dialTicks(cx: number, cy: number, r: number, count = 24): DialTick[] {
  return Array.from({ length: count + 1 }, (_, i) => {
    const major = i % 6 === 0;
    const deg = ARC_START + ARC_SWEEP * (i / count);
    const p1 = polarPoint(cx, cy, r + 7, deg);
    const p2 = polarPoint(cx, cy, r + (major ? 12 : 10), deg);
    return { x1: p1.x, y1: p1.y, x2: p2.x, y2: p2.y, major };
  });
}
