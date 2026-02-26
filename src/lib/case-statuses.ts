/**
 * Canonical case lifecycle statuses.
 * Order matters — it drives the visual timeline.
 */
export const CASE_STATUSES = [
  "new",
  "scheduled",
  "quoted",
  "approved",
  "assigned",
  "in_progress",
  "with_partner",
  "qc",
  "released",
  "archived",
] as const;

export type CaseStatus = (typeof CASE_STATUSES)[number];

export const STATUS_LABELS: Record<CaseStatus, string> = {
  new: "New",
  scheduled: "Scheduled",
  quoted: "Quoted",
  approved: "Approved",
  assigned: "Assigned",
  in_progress: "In Progress",
  with_partner: "With Partner",
  qc: "QC",
  released: "Released",
  archived: "Archived",
};

export const STATUS_COLORS: Record<CaseStatus, string> = {
  new: "bg-muted text-muted-foreground",
  scheduled: "bg-muted text-muted-foreground",
  quoted: "bg-primary/10 text-primary",
  approved: "bg-success/10 text-success",
  assigned: "bg-accent/10 text-accent",
  in_progress: "bg-primary/10 text-primary",
  with_partner: "bg-warning/10 text-warning",
  qc: "bg-accent/10 text-accent",
  released: "bg-success/10 text-success",
  archived: "bg-muted text-muted-foreground",
};

/** Map status transitions to audit action_type */
export const STATUS_AUDIT_MAP: Record<string, string> = {
  new: "CASE_CREATED",
  scheduled: "CASE_SCHEDULED",
  quoted: "CASE_QUOTED",
  approved: "CASE_APPROVED",
  assigned: "CASE_ASSIGNED",
  in_progress: "CASE_WORK_STARTED",
  with_partner: "CASE_WITH_PARTNER",
  qc: "CASE_QC",
  released: "CASE_RELEASED",
  archived: "CASE_ARCHIVED",
  cancelled: "CASE_REJECTED",
};

export const CASE_TYPE_LABELS: Record<string, string> = {
  routine: "Routine",
  interim: "Interim",
  fastball: "Fastball",
};

export const REPORT_TIER_LABELS: Record<string, string> = {
  basic: "Basic",
  standard: "Standard",
  enhanced: "Enhanced",
};
