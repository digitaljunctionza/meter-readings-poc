import type { FlagStatus } from "@/lib/types";

// Admin-facing wording and colours for the flag a reading was given at capture.
export const ADMIN_FLAG_LABEL: Record<FlagStatus, string> = {
  ok: "OK",
  below_prev: "Below previous",
  above_2x_avg: "Above 2x average",
  possible_partial: "Possible partial entry",
};

export const FLAG_CLASS: Record<FlagStatus, string> = {
  ok: "border-green-200 text-green-700",
  below_prev: "border-red-200 text-red-700",
  above_2x_avg: "border-orange-200 text-orange-700",
  possible_partial: "border-accent-light text-accent",
};

export const FLAG_DOT_CLASS: Record<FlagStatus, string> = {
  ok: "bg-green-500",
  below_prev: "bg-red-500",
  above_2x_avg: "bg-orange-500",
  possible_partial: "bg-accent",
};

// Client-facing status pills use three calm tones rather than per-flag colours.
export type StatusTone = "good" | "watch" | "neutral";

export const TONE_CLASS: Record<StatusTone, { pill: string; dot: string }> = {
  good: { pill: "border-green-200 bg-green-50 text-green-700", dot: "bg-green-500" },
  watch: { pill: "border-amber-200 bg-amber-50 text-amber-800", dot: "bg-amber-500" },
  neutral: { pill: "border-slate-200 bg-slate-50 text-slate-600", dot: "bg-slate-400" },
};
