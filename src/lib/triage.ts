import type { FlagStatus } from "@/lib/types";

/**
 * A flagged reading is one of three quite different things, and the flat queue
 * treated them alike: a number that is plainly wrong and is corrupting
 * reports right now, a number worth a human glance, and a number that only
 * tripped a threshold. Ranking them lets the first kind be dealt with first.
 */
export type TriageBand = "fix" | "look" | "low";

/** Usage this many times the meter's own average is a mistyped digit, not a leak. */
const IMPLAUSIBLE_MULTIPLE = 20;

export const BAND_META: Record<
  TriageBand,
  { title: string; blurb: string; pill: string; bar: string; defaultOpen: boolean }
> = {
  fix: {
    title: "Fix now",
    blurb: "These are distorting usage totals and the reports clients see.",
    pill: "bg-red-100 text-red-800",
    bar: "border-l-red-500",
    defaultOpen: true,
  },
  look: {
    title: "Worth a look",
    blurb: "Real changes worth confirming — a drop, or an entry that may be incomplete.",
    pill: "bg-amber-100 text-amber-800",
    bar: "border-l-amber-500",
    defaultOpen: true,
  },
  low: {
    title: "Probably fine",
    blurb: "Above this meter's usual, but not by enough to suggest an error.",
    pill: "bg-slate-200 text-slate-700",
    bar: "border-l-slate-300",
    defaultOpen: false,
  },
};

export interface Triage {
  band: TriageBand;
  /** Plain-language reason this reading is in this band. */
  reason: string;
  /** Ranks within a band — bigger distortion first. */
  weight: number;
}

export function triageReading(params: {
  flagStatus: FlagStatus;
  usage: number | null;
  trailingAverage: number | null;
}): Triage {
  const { flagStatus, usage, trailingAverage } = params;
  const multiple = usage !== null && trailingAverage && trailingAverage > 0 ? usage / trailingAverage : null;

  // A reading so far above the meter's own history that it can't be real
  // consumption — the signature of an extra digit, and the thing that turns a
  // month's total into millions.
  if (multiple !== null && multiple >= IMPLAUSIBLE_MULTIPLE) {
    return {
      band: "fix",
      // Past a certain point the multiple stops being information — "900000×"
      // reads as noise where "far above" reads as a verdict.
      reason:
        multiple >= 100
          ? "Far above this meter's usual month — almost certainly a digit too many"
          : `Uses ${Math.round(multiple)}× this meter's usual month — likely a digit too many`,
      weight: usage ?? 0,
    };
  }

  if (flagStatus === "possible_partial") {
    return {
      band: "look",
      reason: "The entry doesn't look like a complete reading",
      weight: 3,
    };
  }

  if (flagStatus === "below_prev") {
    return {
      band: "look",
      reason: "Lower than the previous reading — a misread, or the meter was swapped",
      weight: 2,
    };
  }

  if (flagStatus === "above_2x_avg") {
    return {
      band: "low",
      reason: multiple
        ? `Uses ${multiple.toFixed(1)}× this meter's usual month`
        : "Above this meter's usual month",
      weight: multiple ?? 1,
    };
  }

  return { band: "low", reason: "Flagged at capture", weight: 0 };
}

export const BAND_ORDER: TriageBand[] = ["fix", "look", "low"];
