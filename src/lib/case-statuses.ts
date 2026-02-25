/**
 * Canonical case lifecycle statuses.
 * Order matters — it drives the visual timeline.
 */
export const CASE_STATUSES = [
  "scheduled",
  "quoted",
  "submitted",
  "approved",
  "assigned",
  "in_progress",
  "awaiting_client",
  "qc",
  "delivered",
  "closed",
] as const;

export type CaseStatus = (typeof CASE_STATUSES)[number];

export const STATUS_LABELS: Record<CaseStatus, string> = {
  scheduled: "Scheduled",
  quoted: "Quoted",
  submitted: "Submitted",
  approved: "Approved",
  assigned: "Assigned",
  in_progress: "In Progress",
  awaiting_client: "Awaiting Client",
  qc: "QC",
  delivered: "Delivered",
  closed: "Closed",
};

export const STATUS_COLORS: Record<CaseStatus, string> = {
  scheduled: "bg-muted text-muted-foreground",
  quoted: "bg-primary/10 text-primary",
  submitted: "bg-accent/10 text-accent",
  approved: "bg-success/10 text-success",
  assigned: "bg-accent/10 text-accent",
  in_progress: "bg-primary/10 text-primary",
  awaiting_client: "bg-warning/10 text-warning",
  qc: "bg-accent/10 text-accent",
  delivered: "bg-success/10 text-success",
  closed: "bg-muted text-muted-foreground",
};

/** Map status transitions to audit action_type */
export const STATUS_AUDIT_MAP: Record<string, string> = {
  scheduled: "CASE_SCHEDULED",
  submitted: "CASE_SUBMITTED",
  quoted: "CASE_QUOTED",
  approved: "CASE_APPROVED",
  assigned: "CASE_ASSIGNED",
  in_progress: "CASE_WORK_STARTED",
  awaiting_client: "CASE_AWAITING",
  qc: "CASE_QC",
  delivered: "CASE_DELIVERED",
  closed: "CASE_CLOSED",
  cancelled: "CASE_REJECTED",
};
