export const PARTNER_TASK_STATUSES = [
  "sent",
  "accepted",
  "in_progress",
  "submitted",
  "clarification_requested",
  "completed",
] as const;

export type PartnerTaskStatus = (typeof PARTNER_TASK_STATUSES)[number];

export const PARTNER_STATUS_LABELS: Record<PartnerTaskStatus, string> = {
  sent: "Sent",
  accepted: "Accepted",
  in_progress: "In Progress",
  submitted: "Submitted",
  clarification_requested: "Clarification Requested",
  completed: "Completed",
};

export const PARTNER_STATUS_COLORS: Record<PartnerTaskStatus, string> = {
  sent: "bg-muted text-muted-foreground",
  accepted: "bg-primary/10 text-primary",
  in_progress: "bg-accent/10 text-accent",
  submitted: "bg-success/10 text-success",
  clarification_requested: "bg-warning/10 text-warning",
  completed: "bg-success/10 text-success",
};
