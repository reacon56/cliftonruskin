import { differenceInDays, format, formatDistanceToNow } from "date-fns";

export type FreshnessStatus = "FRESH" | "STALE" | "UNKNOWN";

export interface CadenceRule {
  indicator_type: string;
  expected_max_age_days: number;
  notes: string | null;
}

/**
 * Compute freshness for a single indicator given its retrieved_at date
 * and the cadence rule for that indicator type.
 */
export function computeFreshness(
  retrievedAt: string | null | undefined,
  rule: CadenceRule | undefined
): { status: FreshnessStatus; ageDays: number | null; maxDays: number | null } {
  if (!retrievedAt || !rule) {
    return { status: "UNKNOWN", ageDays: null, maxDays: rule?.expected_max_age_days ?? null };
  }
  const ageDays = differenceInDays(new Date(), new Date(retrievedAt));
  const status: FreshnessStatus = ageDays <= rule.expected_max_age_days ? "FRESH" : "STALE";
  return { status, ageDays, maxDays: rule.expected_max_age_days };
}

/**
 * Compute worst-case freshness across multiple indicators.
 * STALE wins over FRESH; UNKNOWN is treated as STALE for overall.
 */
export function computeOverallFreshness(
  statuses: FreshnessStatus[]
): FreshnessStatus {
  if (statuses.length === 0) return "UNKNOWN";
  if (statuses.includes("STALE")) return "STALE";
  if (statuses.includes("UNKNOWN")) return "UNKNOWN";
  return "FRESH";
}

/**
 * Colour tokens for each freshness status (semantic).
 */
export function freshnessColor(status: FreshnessStatus) {
  switch (status) {
    case "FRESH":
      return { bg: "bg-emerald-500/10", text: "text-emerald-600 dark:text-emerald-400", border: "border-emerald-500/20" };
    case "STALE":
      return { bg: "bg-amber-500/10", text: "text-amber-600 dark:text-amber-400", border: "border-amber-500/20" };
    case "UNKNOWN":
      return { bg: "bg-muted/40", text: "text-muted-foreground", border: "border-border" };
  }
}

export function freshnessTooltipText(
  status: FreshnessStatus,
  retrievedAt: string | null | undefined,
  maxDays: number | null
): string {
  const retrieved = retrievedAt
    ? `Retrieved on ${format(new Date(retrievedAt), "dd MMM yyyy")}`
    : "No retrieval date recorded";
  const cadence = maxDays != null
    ? `Expected refresh every ${maxDays} days`
    : "No cadence rule configured";
  return `${status} — ${retrieved}; ${cadence}.`;
}
