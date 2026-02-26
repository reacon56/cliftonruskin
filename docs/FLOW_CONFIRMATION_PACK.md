# Clifton Ruskin — Flow Confirmation Pack

> **Purpose:** Validate implemented user flows against the intended operating model.
> Generated: 2026-02-26. Reference: `docs/PLATFORM_STATE_AND_ROADMAP.md`.

---

## EXECUTIVE SUMMARY: DECISIONS REQUIRED

| # | Decision | Workflow | Default Recommendation | Impact if Not Decided |
|---|---|---|---|---|
| D1 | Should QC be mandatory before delivery, or can Manager bypass? | Case Lifecycle / QC | **Mandatory** — no bypass | Officers can skip QC via "Simulate Delivery" button today |
| D2 | Should `rejected` be a distinct status, or reuse `cancelled`? | Case Lifecycle | **Distinct `rejected` status** | Currently both rejection and cancellation map to `cancelled`, losing audit clarity |
| D3 | Who closes cases — Client Admin only, or also Manager? | Case Lifecycle | **Client Admin only** (per roadmap) | Currently both Client Admin AND Manager/Ops Admin can close |
| D4 | Should approval of upgrade request auto-enable the feature? | Upgrade Lifecycle | **No** (current) — add opt-in per EPIC 4.1 | Manual two-step remains; risk of forgotten enablement |
| D5 | Should upgrade approval write an audit event? | Upgrade Lifecycle | **Yes** | Currently no audit event on approve/decline |
| D6 | Should `client_auditor` see the Approvals queue (read-only)? | Approvals | **Yes** — read-only visibility | Currently excluded entirely |
| D7 | Should the `awaiting_client` → `in_progress` transition be limited to the assigned officer? | Case Lifecycle | **Yes** — assigned officer only | Currently any `canWork` user can resume |
| D8 | Should partner task status changes write audit events? | Partner Lifecycle | **Yes** | Currently no audit trail for partner task transitions |
| D9 | Should the Ownership "Edit Relationships" capability require the feature flag to be enabled? | Ownership Module | **Yes** | Currently `canEditRels` is checked but the feature flag `ownership_structure_intelligence` is not cross-checked |
| D10 | Should `client_requester` be able to close cases? | Case Lifecycle | **No** (per roadmap matrix) | Currently only Client Admin + Manager + Ops Admin — correct as-is |

---

## 1. CASE LIFECYCLE

### 1.1 Current Implemented Flow

```
Commission (→ scheduled) → Quote (→ quoted) → Submit (→ submitted) → Approve (→ approved)
  → Assign (→ assigned) → Begin Work (→ in_progress) ⇄ Awaiting Client (→ awaiting_client)
  → Submit to QC (→ qc) → Approve & Deliver (→ delivered) → Close (→ closed)
```

**Pre-approval start:** If `allow_pre_approval_start = true`, Manager can assign from `scheduled` or `quoted` status.

**Rejection:** Maps to `cancelled`. No distinct `rejected` status.

**Who can do what (as implemented):**

| Action | Implemented Gate | Code Location |
|---|---|---|
| Commission | `client_admin` or `client_requester` | CommissionPage + RLS |
| Generate Quote | `canQuote` (Manager, Ops Admin) | QuotePanel |
| Approve/Reject Quote | `client_admin` OR `isInternal` | ApprovalsPage line 44, CaseDetailPage line 412 |
| Assign | `canAssign` (Manager, Ops Admin) | CaseDetailPage line 430 |
| Begin Work | `canWork` (Officer, Analyst, Manager, Ops Admin) | CaseDetailPage line 448 |
| Submit to QC | `canWork` | CaseDetailPage line 462 |
| QC Approve & Deliver | `canQc` (Lead, QR, Ops Admin) | CaseDetailPage line 482 |
| Simulate Delivery (bypass QC) | `canWork` | CaseDetailPage line 468 |
| Close | `client_admin` OR `canClose` (Manager, Ops Admin) | CaseDetailPage line 507 |

### 1.2 Intended Flow (per Roadmap §2.1)

```
Commission → Quote → Approve → Assign → Execute → QC (mandatory) → Deliver → Close
```

| Step | Who (R) | Who (A) |
|---|---|---|
| Approve/Reject Quote | **Client Admin only** | Client Admin |
| Assign | Manager, Ops Admin | Manager |
| QC | Lead, Quality Reviewer | Lead |
| Deliver | Manager | Manager |
| Close | **Client Admin** | Client Admin |

### 1.3 Mismatches Found

| # | Mismatch | Severity | Details |
|---|---|---|---|
| M1 | **QC bypass exists** | 🔴 High | "Simulate Delivery" button on `in_progress` allows `canWork` users to jump directly to `delivered`, skipping `qc` entirely. Roadmap says QC is mandatory (Step 6). |
| M2 | **Internal users can approve quotes** | 🟠 Medium | ApprovalsPage line 44: `canApprove = hasRole("client_admin") || isInternal`. Roadmap §2.1 Step 3 says only Client Admin approves. Internal should not approve their own quotes. |
| M3 | **Manager can close cases** | 🟡 Low | Roadmap Step 8 says Client Admin closes. Code allows `canClose` (Manager, Ops Admin) too. This may be intentional for operational flexibility. **→ Decision D3** |
| M4 | **No `rejected` status** | 🟡 Low | Rejection maps to `cancelled` with audit action `CASE_REJECTED`. No way to distinguish cancelled-by-client from rejected-quote in DB queries. **→ Decision D2** |
| M5 | **Awaiting Client resume not scoped to assigned officer** | 🟡 Low | Any `canWork` user can resume, not just the assigned officer. **→ Decision D7** |

### 1.4 Required Changes (if all recommendations accepted)

| Change | Type | Detail |
|---|---|---|
| Remove "Simulate Delivery" from `in_progress` | UI | CaseDetailPage line 468: remove or gate behind dev/demo flag |
| Restrict quote approval to `client_admin` only | UI + Logic | ApprovalsPage line 44: remove `|| isInternal`. CaseDetailPage line 412: keep `isInternal` only for `submitted` legacy gate or remove entirely |
| Add `rejected` to CASE_STATUSES | Lib + DB | `case-statuses.ts`: add between `submitted` and `approved`. Migration: no schema change needed (status is text) |
| Scope `awaiting_client` resume to assigned officer | UI | CaseDetailPage line 497: add `caseData.assigned_to === user?.id` check |

---

## 2. QC & SIGN-OFF

### 2.1 Current Implemented Flow

```
in_progress → qc (via "Submit to QC" by canWork)
qc → delivered (via "Approve & Deliver" by canQc — which also creates deliverables)
qc → in_progress (via "Return to Officer" by canQc)
```

**QC is structurally optional** because the "Simulate Delivery" button bypasses it entirely (see M1).

### 2.2 Intended Flow

```
in_progress → qc (mandatory gate)
qc → delivered (QC reviewer approves; Manager creates deliverable)
qc → in_progress (QC reviewer returns with notes)
```

**Key principle:** No deliverable should be created without QC sign-off.

### 2.3 Decisions Required

| Decision | Options | Impact |
|---|---|---|
| D1: Mandatory QC | **Yes** (remove bypass) / No (keep bypass for speed) | If Yes: removes "Simulate Delivery" from `in_progress`, forces all cases through `qc`. If No: risk of unreviewed deliverables reaching clients. |

### 2.4 Required Changes

| Change | Type |
|---|---|
| Remove or flag-gate "Simulate Delivery" button | UI (CaseDetailPage) |
| Consider separating "QC approve" from "Create deliverable" | UI refactor — QC reviewer approves, then Manager uploads/creates deliverable separately |
| Add audit event for QC return-to-officer | Logic (currently no audit event for `qc → in_progress`) |

---

## 3. UPGRADE LIFECYCLE

### 3.1 Current Implemented Flow

```
Locked tab → "Request Upgrade" → upgrade_requests (status: pending)
→ Internal reviews at /upgrade-requests
→ Approve or Decline (updates status + resolution_notes)
→ [MANUAL] Admin goes to /feature-controls → toggles flag ON
```

### 3.2 Intended Flow (per Roadmap §2.2)

```
Locked View → Request → Review → Approve/Decline → Enable → Confirm
```

Matches current flow. Roadmap explicitly states "Approval ≠ auto-enable" (current behaviour). EPIC 4.1 (Iteration 2) will add optional auto-enable.

### 3.3 Mismatches Found

| # | Mismatch | Severity |
|---|---|---|
| M6 | **No audit event on upgrade approve/decline** | 🟠 Medium | `handleResolve` in UpgradeRequestsPage updates the record but does not insert into `audit_events`. Roadmap §2.2 Step 5 requires logging to `feature_activation_log` + `billing_events` + `audit_events`. |
| M7 | **No in-app notification for upgrade decisions** | 🟡 Low | Per roadmap §1.4 gap #9. Planned for EPIC 5.1. |
| M8 | **`fvc_assurance_lead` can resolve upgrade requests** | 🟡 Low | UpgradeRequestsPage line 43-46: includes `fvc_assurance_lead`. Roadmap §3.1 Upgrade Queue says only Manager + Ops Admin can approve/decline. |

### 3.4 Required Changes

| Change | Type |
|---|---|
| Add audit event insert on approve/decline | Logic (UpgradeRequestsPage `handleResolve`) |
| Remove `fvc_assurance_lead` from resolve permission | UI (UpgradeRequestsPage line 46) |
| (Future EPIC 4.1) Auto-enable with opt-out checkbox | UI + DB trigger |

---

## 4. OWNERSHIP MODULE VISIBILITY + EDITING

### 4.1 Current Implemented Flow

**Visibility:**
- Feature flag `ownership_structure_intelligence` controls tab visibility
- `canViewOwnership` checks role (all client + all internal roles)
- `canExportOwnership` excludes `client_auditor`
- `canFilterOwnership` excludes `client_auditor`
- `canToggleProvenance` restricts to internal roles only
- `canEditRels` restricts to `fvc_assurance_manager`, `fvc_ops_admin`, `client_admin`

**Editing:**
- Entity relationships table has RLS: `client_admin` on own org, internal users via `is_internal()`
- No cross-check between `canEditRels` and feature flag status

### 4.2 Intended Flow (per Roadmap §3.2)

| Capability | Client Admin | Client Requester | Client Auditor | Internal | Partner |
|---|---|---|---|---|---|
| View tree/graph | ✅ | ✅ | ✅ | ✅ | ❌ |
| Toggle provenance | ❌ | ❌ | ❌ | ✅ | ❌ |
| Export (PNG/PDF) | ✅ | ✅ | ❌ | ✅ | ❌ |
| Filter/search | ✅ | ✅ | ❌ | ✅ | ❌ |
| Edit relationships | ✅ | ❌ | ❌ | Manager + Ops Admin | ❌ |

### 4.3 Mismatches Found

| # | Mismatch | Severity |
|---|---|---|
| M9 | **Feature flag not cross-checked with edit permission** | 🟡 Low | If `ownership_structure_intelligence` is disabled, the tab is locked, but the `canEditRels` permission helper doesn't know about the flag. Not exploitable because the UI is hidden, but RLS doesn't enforce the flag either. **→ Decision D9** |
| M10 | **`client_requester` can view but roadmap says `client_requester` should also export/filter** | ✅ Match | Already implemented correctly in `canExportOwnership` and `canFilterOwnership`. |

### 4.4 Required Changes

| Change | Type |
|---|---|
| (Optional) Add feature-flag check to entity_relationships RLS | DB migration — only if D9 = Yes |
| No other changes needed | — |

---

## 5. PARTNER TASK LIFECYCLE

### 5.1 Current Implemented Flow

```
Created (→ sent) → Accepted → In Progress → Submitted → Completed
                                           → Clarification Requested ↔ In Progress
```

**Implemented permissions:**
- Internal users (`is_internal()`) have full CRUD on `partner_tasks`
- Partners see/update only their own tasks (`partner_user_id = auth.uid()`)
- Partners can insert/view/update evidence on their own tasks
- Partners can insert/view clarifications on their own tasks
- Clients have **zero visibility** of partner tasks (correct per roadmap)

### 5.2 Intended Flow (per Roadmap §2.1 and §3.1)

| Action | Who |
|---|---|
| Create partner task | Manager, Officer (via `canCreatePartnerTasks`) |
| View partner tasks | Internal only (all roles) |
| Work on task | Assigned partner only |
| Submit response | Assigned partner |
| Request clarification | Either side |
| Complete/close task | Internal (Manager, Officer) |
| Promote evidence to client-shareable | Internal only (`is_client_shareable` toggle) |

### 5.3 Mismatches Found

| # | Mismatch | Severity |
|---|---|---|
| M11 | **No audit events for partner task status changes** | 🟠 Medium | Partner task transitions (sent → accepted → submitted → completed) are not logged to `audit_events`. **→ Decision D8** |
| M12 | **Partner can update task status to any value** | 🟡 Low | RLS allows `UPDATE` but doesn't constrain which status values a partner can set. A partner could theoretically set status to `completed` directly. The UI only shows valid transitions, but the DB doesn't enforce them. |
| M13 | **`fvc_analyst` (legacy role) can create partner tasks** | 🟡 Low | `canCreatePartnerTasks` includes `fvc_analyst`. This is consistent with the role being "still recognised" per `fvc-roles.ts` line 13-14. No action needed unless the role is formally deprecated. |

### 5.4 Required Changes

| Change | Type |
|---|---|
| Add audit event inserts on partner task status changes | UI (PartnerTaskDetailPage) or DB trigger |
| (Optional) Add DB trigger to validate partner status transitions | DB migration |
| (Optional) Restrict partner UPDATE to valid forward transitions only | DB function + RLS |

---

## 6. CONTRADICTIONS IN PLATFORM STATE & ROADMAP DOC

| # | Section | Contradiction | Resolution |
|---|---|---|---|
| C1 | §1.3 vs App.tsx | Roadmap says "Remove `/admin` from nav and redirect. Remove `/templates` and `/monitoring-rules` if they exist in sidebar." **All three still exist in sidebar** (`AppSidebar.tsx` lines 71-73) and as stub routes (`App.tsx` lines 106-108). | Remove from sidebar. Redirect `/admin` to `/feature-controls`. |
| C2 | §2.1 Step 3 vs ApprovalsPage | Roadmap: "Approve: Client Admin / Client Admin". Code: `canApprove = hasRole("client_admin") || isInternal`. Internal should not approve client quotes. | Fix code to match roadmap. |
| C3 | §2.1 Step 8 vs CaseDetailPage | Roadmap: "Complete: Client Admin / Client Admin". Code: allows `canClose` (Manager + Ops Admin). | Decide: is Manager close intentional? Update doc or code. |
| C4 | §3.1 Upgrade Queue | Roadmap matrix shows Assurance Manager + Ops Admin can approve/decline. Code also includes `fvc_assurance_lead`. | Remove Lead from resolve permission, or update roadmap. |
| C5 | §1.3 Stub Pages | Roadmap lists `/admin` as "Redirect to `/feature-controls` (Iteration 1)". This action item has not been completed despite being in Iteration 1 scope. | Execute the redirect. |
| C6 | §1.4 Gap #10 | "Feature-locked states inconsistent across tabs". This is listed as Iteration 1 (EPIC 3.1) but the shared `<FeatureLockedCard>` has not been extracted yet. | Complete EPIC 3.1. |

---

## 7. SUMMARY TABLE: ALL MISMATCHES

| ID | Workflow | Finding | Severity | Decision Needed? |
|---|---|---|---|---|
| M1 | Case | QC bypass via Simulate Delivery | 🔴 High | D1 |
| M2 | Case | Internal can approve quotes | 🟠 Medium | — (fix to match roadmap) |
| M3 | Case | Manager can close cases | 🟡 Low | D3 |
| M4 | Case | No `rejected` status | 🟡 Low | D2 |
| M5 | Case | Resume not scoped to assigned officer | 🟡 Low | D7 |
| M6 | Upgrade | No audit on approve/decline | 🟠 Medium | D5 |
| M7 | Upgrade | No in-app notification | 🟡 Low | — (EPIC 5.1) |
| M8 | Upgrade | Lead can resolve requests | 🟡 Low | — (fix to match roadmap) |
| M9 | Ownership | Feature flag not cross-checked with edit | 🟡 Low | D9 |
| M11 | Partner | No audit for task transitions | 🟠 Medium | D8 |
| M12 | Partner | Partner can set any status value | 🟡 Low | — (optional hardening) |

---

*End of Flow Confirmation Pack. Present decisions D1–D10 to founders for sign-off before implementing fixes.*
