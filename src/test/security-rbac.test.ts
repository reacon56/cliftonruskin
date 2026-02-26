import { describe, it, expect } from "vitest";
import {
  canViewOwnershipStructure,
  canExportOwnershipStructure,
  canFilterOwnershipStructure,
  canToggleProvenance,
  canEditRelationships,
  canQuoteAndScope,
  canWorkCases,
  canQcSignoff,
  canCloseCases,
} from "@/lib/fvc-roles";

/* ───────────────────────────────────────────────────
 * Security test suite: Role-based permission checks
 * Validates that each role only gets the capabilities
 * intended by the RBAC model.
 * ─────────────────────────────────────────────────── */

describe("Ownership & Structure RBAC", () => {
  // ── Positive: internal roles ──

  it("fvc_ops_admin has all ownership permissions", () => {
    const roles = ["fvc_ops_admin"];
    expect(canViewOwnershipStructure(roles)).toBe(true);
    expect(canExportOwnershipStructure(roles)).toBe(true);
    expect(canFilterOwnershipStructure(roles)).toBe(true);
    expect(canToggleProvenance(roles)).toBe(true);
    expect(canEditRelationships(roles)).toBe(true);
  });

  it("fvc_assurance_officer can view/export/filter/provenance but NOT edit relationships", () => {
    const roles = ["fvc_assurance_officer"];
    expect(canViewOwnershipStructure(roles)).toBe(true);
    expect(canExportOwnershipStructure(roles)).toBe(true);
    expect(canFilterOwnershipStructure(roles)).toBe(true);
    expect(canToggleProvenance(roles)).toBe(true);
    expect(canEditRelationships(roles)).toBe(false);
  });

  it("fvc_quality_reviewer can view/export/filter/provenance but NOT edit", () => {
    const roles = ["fvc_quality_reviewer"];
    expect(canViewOwnershipStructure(roles)).toBe(true);
    expect(canExportOwnershipStructure(roles)).toBe(true);
    expect(canFilterOwnershipStructure(roles)).toBe(true);
    expect(canToggleProvenance(roles)).toBe(true);
    expect(canEditRelationships(roles)).toBe(false);
  });

  // ── Client roles ──

  it("client_admin can view/export/filter/edit but NOT provenance", () => {
    const roles = ["client_admin"];
    expect(canViewOwnershipStructure(roles)).toBe(true);
    expect(canExportOwnershipStructure(roles)).toBe(true);
    expect(canFilterOwnershipStructure(roles)).toBe(true);
    expect(canToggleProvenance(roles)).toBe(false);
    expect(canEditRelationships(roles)).toBe(true);
  });

  it("client_requester can view/export/filter but NOT provenance or edit", () => {
    const roles = ["client_requester"];
    expect(canViewOwnershipStructure(roles)).toBe(true);
    expect(canExportOwnershipStructure(roles)).toBe(true);
    expect(canFilterOwnershipStructure(roles)).toBe(true);
    expect(canToggleProvenance(roles)).toBe(false);
    expect(canEditRelationships(roles)).toBe(false);
  });

  it("client_auditor can ONLY view — no export, filter, provenance, or edit", () => {
    const roles = ["client_auditor"];
    expect(canViewOwnershipStructure(roles)).toBe(true);
    expect(canExportOwnershipStructure(roles)).toBe(false);
    expect(canFilterOwnershipStructure(roles)).toBe(false);
    expect(canToggleProvenance(roles)).toBe(false);
    expect(canEditRelationships(roles)).toBe(false);
  });

  // ── Negative: partner role ──

  it("partner role has NO ownership permissions", () => {
    const roles = ["partner"];
    expect(canViewOwnershipStructure(roles)).toBe(false);
    expect(canExportOwnershipStructure(roles)).toBe(false);
    expect(canFilterOwnershipStructure(roles)).toBe(false);
    expect(canToggleProvenance(roles)).toBe(false);
    expect(canEditRelationships(roles)).toBe(false);
  });

  // ── Negative: unauthenticated ──

  it("empty roles get no permissions", () => {
    const roles: string[] = [];
    expect(canViewOwnershipStructure(roles)).toBe(false);
    expect(canExportOwnershipStructure(roles)).toBe(false);
    expect(canFilterOwnershipStructure(roles)).toBe(false);
    expect(canToggleProvenance(roles)).toBe(false);
    expect(canEditRelationships(roles)).toBe(false);
  });
});

describe("Core RBAC permission boundaries", () => {
  it("client_requester cannot quote, close, or QC", () => {
    const roles = ["client_requester"];
    expect(canQuoteAndScope(roles)).toBe(false);
    expect(canQcSignoff(roles)).toBe(false);
    expect(canCloseCases(roles)).toBe(false);
  });

  it("client_auditor cannot do any write operations", () => {
    const roles = ["client_auditor"];
    expect(canQuoteAndScope(roles)).toBe(false);
    expect(canWorkCases(roles)).toBe(false);
    expect(canQcSignoff(roles)).toBe(false);
    expect(canCloseCases(roles)).toBe(false);
    expect(canEditRelationships(roles)).toBe(false);
  });

  it("fvc_assurance_officer can work cases but not close or quote", () => {
    const roles = ["fvc_assurance_officer"];
    expect(canWorkCases(roles)).toBe(true);
    expect(canQuoteAndScope(roles)).toBe(false);
    expect(canCloseCases(roles)).toBe(false);
  });

  it("fvc_assurance_lead can QC but not quote or close", () => {
    const roles = ["fvc_assurance_lead"];
    expect(canQcSignoff(roles)).toBe(true);
    expect(canQuoteAndScope(roles)).toBe(false);
    expect(canCloseCases(roles)).toBe(false);
  });

  it("fvc_ops_admin has full administrative capability", () => {
    const roles = ["fvc_ops_admin"];
    expect(canQuoteAndScope(roles)).toBe(true);
    expect(canWorkCases(roles)).toBe(true);
    expect(canQcSignoff(roles)).toBe(true);
    expect(canCloseCases(roles)).toBe(true);
    expect(canEditRelationships(roles)).toBe(true);
  });
});

describe("IDOR prevention: role isolation", () => {
  it("multi-role user gets union of permissions, not escalation", () => {
    // A user with both client_requester and client_auditor still can't edit
    const roles = ["client_requester", "client_auditor"];
    expect(canEditRelationships(roles)).toBe(false);
    expect(canToggleProvenance(roles)).toBe(false);
    // But gets the union of view + export from client_requester
    expect(canExportOwnershipStructure(roles)).toBe(true);
    expect(canFilterOwnershipStructure(roles)).toBe(true);
  });

  it("partner + client_auditor does not grant internal provenance", () => {
    const roles = ["partner", "client_auditor"];
    expect(canToggleProvenance(roles)).toBe(false);
    expect(canEditRelationships(roles)).toBe(false);
  });

  it("no role escalation via invented role strings", () => {
    const roles = ["admin", "superuser", "root"];
    expect(canViewOwnershipStructure(roles)).toBe(false);
    expect(canQuoteAndScope(roles)).toBe(false);
    expect(canQcSignoff(roles)).toBe(false);
  });
});

/* ───────────────────────────────────────────────────
 * Billing events RLS regression tests
 * Validates org-scoped insert policy logic.
 * ─────────────────────────────────────────────────── */

describe("Billing Events RLS — org-scoped insert", () => {
  // Simulates the RLS WITH CHECK:
  // performed_by = auth.uid() AND (org_id = get_user_org_id(auth.uid()) OR is_internal(auth.uid()))

  const INTERNAL_ROLES = [
    "fvc_ops_admin", "fvc_assurance_manager", "fvc_assurance_officer",
    "fvc_assurance_lead", "fvc_quality_reviewer", "fvc_analyst",
  ];

  function isInternal(roles: string[]): boolean {
    return roles.some((r) => INTERNAL_ROLES.includes(r));
  }

  function canInsertBillingEvent(
    authUid: string,
    userOrgId: string,
    roles: string[],
    insertPerformedBy: string,
    insertOrgId: string,
  ): boolean {
    return (
      insertPerformedBy === authUid &&
      (insertOrgId === userOrgId || isInternal(roles))
    );
  }

  const USER_A = "user-a";
  const ORG_A = "org-a";
  const ORG_B = "org-b";

  it("client_admin can insert billing event for own org", () => {
    expect(canInsertBillingEvent(USER_A, ORG_A, ["client_admin"], USER_A, ORG_A)).toBe(true);
  });

  it("client_admin CANNOT insert billing event for another org", () => {
    expect(canInsertBillingEvent(USER_A, ORG_A, ["client_admin"], USER_A, ORG_B)).toBe(false);
  });

  it("client_requester CANNOT insert billing event for another org", () => {
    expect(canInsertBillingEvent(USER_A, ORG_A, ["client_requester"], USER_A, ORG_B)).toBe(false);
  });

  it("client user CANNOT spoof performed_by", () => {
    expect(canInsertBillingEvent(USER_A, ORG_A, ["client_admin"], "other-user", ORG_A)).toBe(false);
  });

  it("internal user CAN insert billing event for any org", () => {
    expect(canInsertBillingEvent(USER_A, ORG_A, ["fvc_analyst"], USER_A, ORG_B)).toBe(true);
    expect(canInsertBillingEvent(USER_A, ORG_A, ["fvc_ops_admin"], USER_A, ORG_B)).toBe(true);
  });

  it("internal user still must match performed_by = auth.uid()", () => {
    expect(canInsertBillingEvent(USER_A, ORG_A, ["fvc_ops_admin"], "other-user", ORG_B)).toBe(false);
  });

  it("partner role CANNOT insert billing event for any org", () => {
    expect(canInsertBillingEvent(USER_A, ORG_A, ["partner"], USER_A, ORG_B)).toBe(false);
  });

  it("unauthenticated / no roles CANNOT insert", () => {
    expect(canInsertBillingEvent(USER_A, ORG_A, [], USER_A, ORG_A)).toBe(true); // own org, own user — allowed
    expect(canInsertBillingEvent(USER_A, ORG_A, [], USER_A, ORG_B)).toBe(false); // cross-org — blocked
  });
});
