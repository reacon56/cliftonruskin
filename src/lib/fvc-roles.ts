/**
 * Clifton Ruskin Internal Role Definitions
 * 
 * Premium role names and their permissions for the internal team.
 */

export type FvcRole =
  | "fvc_assurance_manager"
  | "fvc_assurance_officer"
  | "fvc_assurance_lead"
  | "fvc_quality_reviewer"
  | "fvc_ops_admin"
  // Legacy — still recognised by is_internal()
  | "fvc_analyst";

/** Human-readable role labels for UI display */
export const FVC_ROLE_LABELS: Record<string, string> = {
  fvc_assurance_manager: "Assurance Manager",
  fvc_assurance_officer: "Assurance Officer",
  fvc_assurance_lead: "Assurance Lead",
  fvc_quality_reviewer: "Quality Reviewer",
  fvc_ops_admin: "Operations Admin",
  // Legacy
  fvc_analyst: "Analyst",
  // Client-side
  client_admin: "Client Admin",
  client_requester: "Client Requester",
  client_auditor: "Client Auditor",
  partner: "Partner",
};

/**
 * Permission helper — checks whether a set of user roles grants a specific capability.
 */
export function canQuoteAndScope(roles: string[]): boolean {
  return roles.some((r) =>
    ["fvc_assurance_manager", "fvc_ops_admin"].includes(r)
  );
}

export function canAssignOfficers(roles: string[]): boolean {
  return roles.some((r) =>
    ["fvc_assurance_manager", "fvc_ops_admin"].includes(r)
  );
}

export function canWorkCases(roles: string[]): boolean {
  return roles.some((r) =>
    ["fvc_assurance_officer", "fvc_analyst", "fvc_assurance_manager", "fvc_ops_admin"].includes(r)
  );
}

export function canCreatePartnerTasks(roles: string[]): boolean {
  return roles.some((r) =>
    ["fvc_assurance_officer", "fvc_analyst", "fvc_assurance_manager", "fvc_ops_admin"].includes(r)
  );
}

export function canQcSignoff(roles: string[]): boolean {
  return roles.some((r) =>
    ["fvc_assurance_lead", "fvc_quality_reviewer", "fvc_ops_admin"].includes(r)
  );
}

export function canCloseCases(roles: string[]): boolean {
  return roles.some((r) =>
    ["fvc_assurance_manager", "fvc_ops_admin"].includes(r)
  );
}

export function canAdjustDueDates(roles: string[]): boolean {
  return roles.some((r) =>
    ["fvc_assurance_manager", "fvc_ops_admin"].includes(r)
  );
}

/** Ownership & Structure module permissions */
export function canViewOwnershipStructure(roles: string[]): boolean {
  return roles.some((r) =>
    [
      "fvc_assurance_manager", "fvc_assurance_officer", "fvc_assurance_lead",
      "fvc_quality_reviewer", "fvc_ops_admin", "fvc_analyst",
      "client_admin", "client_requester", "client_auditor",
    ].includes(r)
  );
}

export function canExportOwnershipStructure(roles: string[]): boolean {
  return roles.some((r) =>
    [
      "fvc_assurance_manager", "fvc_assurance_officer", "fvc_assurance_lead",
      "fvc_quality_reviewer", "fvc_ops_admin", "fvc_analyst",
      "client_admin", "client_requester",
    ].includes(r)
  );
}

export function canFilterOwnershipStructure(roles: string[]): boolean {
  return roles.some((r) =>
    [
      "fvc_assurance_manager", "fvc_assurance_officer", "fvc_assurance_lead",
      "fvc_quality_reviewer", "fvc_ops_admin", "fvc_analyst",
      "client_admin", "client_requester",
    ].includes(r)
  );
}

export function canToggleProvenance(roles: string[]): boolean {
  return roles.some((r) =>
    [
      "fvc_assurance_manager", "fvc_assurance_officer", "fvc_assurance_lead",
      "fvc_quality_reviewer", "fvc_ops_admin", "fvc_analyst",
    ].includes(r)
  );
}

export function canEditRelationships(roles: string[]): boolean {
  return roles.some((r) =>
    [
      "fvc_assurance_manager", "fvc_ops_admin",
      "client_admin",
    ].includes(r)
  );
}

/** Platform Admin — manage data_source, ingestion, global configs, raw sanctions */
export function isPlatformAdmin(roles: string[]): boolean {
  return roles.includes("fvc_ops_admin");
}

/** Internal analyst/assurance — view indicators, run risk engine, create entity links, generate reports */
export function isAnalystOrAssurance(roles: string[]): boolean {
  return roles.some((r) =>
    [
      "fvc_assurance_manager", "fvc_assurance_officer", "fvc_assurance_lead",
      "fvc_quality_reviewer", "fvc_ops_admin", "fvc_analyst",
    ].includes(r)
  );
}

/** Client Admin — manage policy rulesets, alert subscriptions, monitored entities */
export function isClientAdmin(roles: string[]): boolean {
  return roles.includes("client_admin");
}

/** Any client role */
export function isClientRole(roles: string[]): boolean {
  return roles.some((r) =>
    ["client_admin", "client_requester", "client_auditor"].includes(r)
  );
}

/** Can manage ingestion sources and data_source records */
export function canManageIngestion(roles: string[]): boolean {
  return roles.includes("fvc_ops_admin");
}

/** Can view raw sanctions_entity data */
export function canViewRawSanctions(roles: string[]): boolean {
  return roles.some((r) => ["fvc_ops_admin", "fvc_assurance_manager"].includes(r));
}

/** Returns the primary display label for a user's CR role */
export function getPrimaryRoleLabel(roles: string[]): string {
  const priority: string[] = [
    "fvc_ops_admin",
    "fvc_assurance_lead",
    "fvc_quality_reviewer",
    "fvc_assurance_manager",
    "fvc_assurance_officer",
    "fvc_analyst",
    "client_admin",
    "client_requester",
    "client_auditor",
    "partner",
  ];
  for (const r of priority) {
    if (roles.includes(r)) return FVC_ROLE_LABELS[r] || r;
  }
  return "Team Member";
}
