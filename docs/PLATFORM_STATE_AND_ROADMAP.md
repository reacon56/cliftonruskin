# Clifton Ruskin — Platform State & Roadmap

> **Single source of truth.** Last updated: 2026-02-26.
> Update this document whenever a module ships, a stub is replaced, or a roadmap item moves.

---

## 1. Current State Snapshot

### 1.1 Live Modules

| Module | Route(s) | Status |
|---|---|---|
| Dashboard | `/dashboard` | ✅ Live |
| Entity Register | `/entities` | ✅ Live |
| Entity Detail (Profile, Overview, Activity) | `/entities/:id` | ✅ Live |
| Case Queue | `/cases` | ✅ Live |
| Case Detail (timeline, messages, DP summary) | `/cases/:id` | ✅ Live |
| Commission Wizard | `/commission` | ✅ Live |
| Approvals Queue | `/approvals` | ✅ Live |
| Auto-Approval Rules | `/auto-approval-settings` | ✅ Live |
| Deliverables Library | `/deliverables` | ✅ Live |
| LIA Library | `/lia-library` | ✅ Live |
| Policies & Risk Matrix | `/policies` | ✅ Live |
| Audit Log | `/audit-log` | ✅ Live |
| Organisation Settings | `/org-settings` | ✅ Live |
| Feature Controls (admin) | `/feature-controls` | ✅ Live |
| Billing & Usage (admin panel) | `/feature-controls` (bottom) | ✅ Live |
| Upgrade Requests Queue | `/upgrade-requests` | ✅ Live |
| Partner Task List | `/partner/tasks` | ✅ Live |
| Partner Task Detail | `/partner/tasks/:id` | ✅ Live |
| Module Workbench (Commercial Posture) | `/cases/:caseId/modules/:moduleId` | ✅ Live |
| Module Workbench (Jurisdiction Benchmark) | `/cases/:caseId/modules/:moduleId` | ✅ Live |
| Website (Home, About, Services, Sectors, Insights, Contact) | `/`, `/about`, etc. | ✅ Live |
| Auth (login/signup) | `/auth` | ✅ Live |

### 1.2 Gated Modules (by Feature Flag)

These modules render but show a locked/upgrade prompt when the org's flag is disabled.

| Feature Flag Key | Controls | Default Tier |
|---|---|---|
| `ownership_structure_intelligence` | Ownership & Structure tab (tree, network, provenance) | Plan: Premium (A) |
| `monitoring_module` | Monitoring tab on entity detail, `/monitoring` page | Plan: Premium (A) |
| `jurisdiction_benchmark` | Jurisdiction Benchmark tab, benchmark workbench | Plan: Premium (A) |
| `advanced_risk_alerts` | Enhanced risk alert UI within monitoring | Plan: Standard (B) |
| `provenance_view` | Provenance layer toggle on ownership views | Plan: Premium (A) |
| `export_pdf_advanced` | Advanced PDF export options | Plan: Standard (B) |

### 1.3 Stub Pages

These routes exist in navigation but render a placeholder "Coming Soon" page (`StubPage.tsx`).

| Route | Nav Label | Replacement Plan |
|---|---|---|
| `/users` | Users & Roles | Iteration 3 — EPIC 2.1 |
| `/clients` | Client Management | Iteration 3 — EPIC 2.2 |
| `/support` | Support | Low priority — link to external support |
| `/admin` | Admin | Redirect to `/feature-controls` (Iteration 1) |

**Action:** Remove `/admin` from nav and redirect. Remove `/templates` and `/monitoring-rules` if they exist in sidebar but have no route.

### 1.4 Known Enforcement Gaps (Top 10)

| # | Gap | Severity | Mitigation Status |
|---|---|---|---|
| 1 | **Entity limit not enforced server-side** — `organisation_plan.entity_limit` is advisory only; no DB trigger blocks excess inserts | 🔴 High | Planned: Iteration 3 (EPIC 1.2) |
| 2 | **Notes YTD count not auto-incremented** — `included_notes_used_ytd` requires manual update after case delivery | 🟠 Medium | Planned: Iteration 2 (EPIC 7.1) |
| 3 | **`client_auditor` read-only not verified** — relies on implicit RLS deny; no automated tests confirm INSERT/UPDATE rejection | 🔴 High | Planned: Iteration 1 (EPIC 2.3) |
| 4 | **No rate limiting on entity/case creation** — bulk creation via API not throttled | 🟠 Medium | Planned: Iteration 3 (EPIC 1.3) |
| 5 | **Entity edits not audited** — changes to entity profile fields have no audit trail | 🟠 Medium | Planned: Iteration 2 (EPIC 6.1) |
| 6 | **Policy rule changes not audited** — review frequency, monitoring level changes untracked | 🟠 Medium | Planned: Iteration 2 (EPIC 6.2) |
| 7 | **Quote creation/approval not audited** — commercial decisions lack explicit audit records | 🟠 Medium | Planned: Iteration 2 (EPIC 6.3) |
| 8 | **Upgrade approval doesn't auto-enable feature** — approving a request requires a separate manual toggle in Feature Controls | 🟡 Low | Planned: Iteration 2 (EPIC 4.1) |
| 9 | **No in-app notification for upgrade decisions** — client must check manually or be told out-of-band | 🟡 Low | Planned: Iteration 2 (EPIC 5.1) |
| 10 | **Feature-locked states inconsistent across tabs** — some premium tabs show partial data instead of a unified locked card | 🟡 Low | Planned: Iteration 1 (EPIC 3.1) |

---

## 2. Operating Model Summary

### 2.1 Case Lifecycle (8 Steps)

```
Commission → Quote → Approve → Assign → Execute → QC → Deliver → Complete
```

| Step | Who (R) | Who (A) | UI Page | Status Transition | Key Rule |
|---|---|---|---|---|---|
| 1. Commission | Client Requester | Client Admin | `/commission` | → `scheduled` | DP declaration required if personal data |
| 2. Quote | Assurance Manager | Assurance Manager | `/cases/:id` | `scheduled` → `quoted` → `submitted` | Creates quote record; notifies Client Admin |
| 3. Approve | Client Admin | Client Admin | `/approvals` | `submitted` → `approved` | Auto-approval rules may bypass; price threshold always requires manual |
| 4. Assign | Assurance Manager | Assurance Manager | `/cases/:id` | `approved` → `assigned` | Selects officer; sets due date and SLA |
| 5. Execute | Officer / Analyst | Assurance Manager | Workbench | `assigned` → `in_progress` | May create partner tasks; may enter `awaiting_client` |
| 6. QC | Quality Reviewer | Assurance Lead | `/cases/:id` | `in_progress` → `qc` | Mandatory sign-off before delivery |
| 7. Deliver | Assurance Manager | Assurance Manager | `/deliverables` | `qc` → `delivered` | Uploads final report; creates deliverable record |
| 8. Complete | Client Admin | Client Admin | `/cases/:id` | `delivered` → `closed` | Cadence scheduler picks up next review cycle |

**Pre-approval start:** Blocked unless org has `allow_pre_approval_start = true`.
**Rush / Tier A / Dossier:** Always require manual approval per auto-approval rules.
**Partners:** See only their assigned tasks — never the case, client, or entity.

### 2.2 Feature Upgrade Lifecycle (6 Steps)

```
Locked View → Request → Review → Approve/Decline → Enable → Confirm
```

| Step | Who (R) | UI Page | What Happens |
|---|---|---|---|
| 1. Locked View | — | Entity detail (locked tab) | Client sees locked card with "Request Upgrade" |
| 2. Request | Client Requester/Admin | Entity detail | `upgrade_requests` record created (status: `pending`) |
| 3. Review | Assurance Manager | `/upgrade-requests` | Reads request details |
| 4. Approve/Decline | Assurance Manager | `/upgrade-requests` | Status → `approved` or `declined`; resolution notes |
| 5. Enable | Ops Admin | `/feature-controls` | Toggle flag ON; logs to `feature_activation_log` + `billing_events` + `audit_events` |
| 6. Confirm | Assurance Manager | Out-of-band (email) | Client sees feature unlocked on next load |

**Key rule:** Approval ≠ auto-enable. Commercial terms may need agreement first. (EPIC 4.1 will add optional auto-enable.)

---

## 3. Permissions Matrix

### 3.1 Core Actions

| Action | Client Admin | Client Requester | Client Auditor | Assurance Manager | Assurance Officer | Assurance Lead | Quality Reviewer | Ops Admin | Partner |
|---|---|---|---|---|---|---|---|---|---|
| View dashboard | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| Commission case | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ | ✅ | ❌ |
| Approve/reject quote | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Create quote & scope | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ✅ | ❌ |
| Assign officers | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ✅ | ❌ |
| Work cases | ❌ | ❌ | ❌ | ✅ | ✅ | ❌ | ❌ | ✅ | ❌ |
| QC sign-off | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ | ❌ |
| Close cases | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ✅ | ❌ |
| Adjust due dates | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ✅ | ❌ |
| Create partner tasks | ❌ | ❌ | ❌ | ✅ | ✅ | ❌ | ❌ | ✅ | ❌ |
| Create/edit entities | ✅ | ✅ | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| Manage policies | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| View audit log | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| Manage org settings | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ |
| Manage feature flags | ❌ | ❌ | ❌ | ✅ | ❌ | ✅ | ❌ | ✅ | ❌ |
| Manage auto-approval rules | ✅ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ✅ | ❌ |
| Submit upgrade request | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Approve/decline upgrades | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ✅ | ❌ |
| View billing | ✅ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ✅ | ❌ |

### 3.2 Module-Level Granularity

#### Ownership & Structure

| Capability | Client Admin | Client Requester | Client Auditor | Internal (all) | Partner |
|---|---|---|---|---|---|
| View ownership tree | ✅ | ✅ | ✅ | ✅ | ❌ |
| View network graph | ✅ | ✅ | ✅ | ✅ | ❌ |
| Toggle provenance layer | ❌ | ❌ | ❌ | ✅ | ❌ |
| Export structure (PNG/PDF) | ✅ | ✅ | ❌ | ✅ | ❌ |
| Filter/search structure | ✅ | ✅ | ❌ | ✅ | ❌ |
| Edit relationships | ✅ | ❌ | ❌ | Manager + Ops Admin only | ❌ |

#### Monitoring

| Capability | Client Admin | Client Requester | Client Auditor | Internal (all) | Partner |
|---|---|---|---|---|---|
| View monitoring events | ✅ | ✅ | ✅ | ✅ | ❌ |
| Configure monitoring rules | ❌ | ❌ | ❌ | Manager + Ops Admin | ❌ |
| Review/dismiss events | ❌ | ❌ | ❌ | ✅ | ❌ |

#### Exports

| Capability | Client Admin | Client Requester | Client Auditor | Internal (all) | Partner |
|---|---|---|---|---|---|
| Export entity list (CSV) | ✅ | ✅ | ✅ | ✅ | ❌ |
| Export audit log (CSV) | ✅ | ❌ | ❌ | ✅ | ❌ |
| Export ownership (PNG) | ✅ | ✅ | ❌ | ✅ | ❌ |
| Export deliverable (PDF) | ✅ | ✅ | ✅ | ✅ | ❌ |
| Advanced PDF export | Gated by `export_pdf_advanced` flag | — | — | ✅ | ❌ |

#### Upgrade Queue

| Capability | Client Admin | Client Requester | Client Auditor | Assurance Manager | Ops Admin |
|---|---|---|---|---|---|
| View own org requests | ✅ | ✅ | ❌ | ✅ (all orgs) | ✅ (all orgs) |
| Submit request | ✅ | ✅ | ❌ | ❌ | ❌ |
| Approve/decline | ❌ | ❌ | ❌ | ✅ | ✅ |
| Enable feature flag | ❌ | ❌ | ❌ | ✅ | ✅ |

---

## 4. Roadmap

### Iteration 1 — Stability & Consistency (Week 1–2)

**Goals:** Eliminate inconsistencies, verify security assumptions, clean up navigation.

| Story | Epic | Size | Success Criteria |
|---|---|---|---|
| Extract tier definitions to shared constants | 3.2 | S | `feature-tiers.ts` is the single source; no duplicated tier logic | 
| Refactor FeatureControlsPanel into sub-components | 3.3 | M | Orchestrator < 100 lines; 4+ focused sub-components |
| Consistent feature-locked cards across all premium tabs | 3.1 | S | Shared `<FeatureLockedCard>` used on Monitoring, Benchmark, Ownership tabs |
| Verify `client_auditor` read-only enforcement | 2.3 | S | Automated tests prove INSERT/UPDATE rejection |
| Remove unused stub nav links | 8.1 | S | `/admin` redirects; no dead links in sidebar |
| Pending upgrade count badge in sidebar | 4.2 | S | Badge shows count; hides at zero |
| Add regression tests (auditor, tier logic, feature gating) | — | S | 8+ new test assertions passing |

**Out of scope:** Users & Roles page, Client Management page, auto-enable on approval, audit triggers.

---

### Iteration 2 — Control & Governance (Week 3–4)

**Goals:** Close audit gaps, automate billing counters, connect upgrade approval to feature enablement.

| Story | Epic | Size | Success Criteria |
|---|---|---|---|
| Auto-enable feature on upgrade approval | 4.1 | M | Approving request upserts `org_feature_flags`; logs to 3 tables; "Skip auto-enable" checkbox available |
| In-app notification for upgrade decisions | 5.1 | S | Toast shown on next load for resolved-but-unnotified requests |
| Audit entity edits (DB trigger) | 6.1 | M | `AFTER UPDATE ON entities` trigger logs changed fields to `audit_events` |
| Audit policy rule changes | 6.2 | S | Trigger on `policy_rules` logs old → new values |
| Audit quote creation & approval | 6.3 | S | Client-side inserts at quote creation and status change |
| Auto-increment notes used YTD | 7.1 | S | DB trigger on `cases` increments `included_notes_used_ytd` when status → `delivered` |
| Overage warning on dashboard | 7.2 | S | Amber at 80%, red at 100% on Plan Utilisation card |

**Out of scope:** Users & Roles page, Client Management page, rate limiting, real-time notifications.

---

### Iteration 3 — Enterprise Features (Week 5–8)

**Goals:** Build missing admin pages, enforce plan limits server-side, add rate limiting.

| Story | Epic | Size | Success Criteria |
|---|---|---|---|
| Users & Roles management page | 2.1 | L | `/users` shows org members; Client Admin can invite + assign client roles; invitation tokens expire in 24h; role changes audited |
| Client organisation management page | 2.2 | L | `/clients` shows all orgs (Ops Admin only); create org with default policy + plan; edit tier, limits, threshold |
| Enforce plan limits server-side | 1.2 | M | `BEFORE INSERT` trigger on `entities` blocks inserts when limit reached; overage billing event on note delivery past limit |
| Rate-limit entity/case creation | 1.3 | M | DB function blocks > 20 entities or > 10 cases per user per 5 min |
| Regression tests (role escalation, IDOR, rate limits) | — | S | 10+ new assertions covering cross-org and role-escalation scenarios |

**Out of scope:** Partner matching algorithm, real-time WebSocket notifications, invoice generation, i18n, custom domains.

---

## 5. Do Not Build Yet

| Item | Rationale |
|---|---|
| **Automated invoice generation** | Manual invoicing sufficient at current scale. `billing_events` + admin readout covers traceability. Revisit at 20+ clients. |
| **Partner matching algorithm** | Manual assignment works. Building matching adds complexity with < 10 active partners. |
| **Real-time notifications (WebSocket)** | Page-load polling is sufficient. Real-time adds infra complexity for marginal UX gain at current user count. |
| **New premium modules** | Module framework is solid. Focus on hardening existing 6 features before adding more. |
| **Merge `feature_activation_log` into `billing_events`** | Tables serve distinct audiences (compliance vs commercial). Merging saves marginal storage, complicates queries. |
| **Database-driven tier definitions** | Current hardcoded tiers (A/B/C) with 6 features are stable. DB-driven config needs a management UI — premature at this scale. Revisit if tiers > 5 or features > 15. |
| **Custom domain / white-labelling** | Not requested, not needed. |
| **Multi-language / i18n** | English-only is appropriate for target market. |
| **Bulk entity import (CSV)** | No client has requested it. Manual creation + API is sufficient. |
| **Mobile-native app** | Web app with responsive design covers all current use cases. |

---

## Appendix: Terminology Reference

| Term | Meaning | DB Column |
|---|---|---|
| **Plan** (Premium / Standard / Essential / Bespoke) | Organisation-level feature tier — controls which platform modules are available | `organisations.feature_tier` (A/B/C/custom) |
| **Risk Tier** (A / B / C) | Entity-level risk classification — controls review frequency, product type, monitoring level | `entities.risk_tier` |
| **Feature Flag** | Per-org boolean controlling access to a specific premium module | `org_feature_flags.enabled` |

> ⚠️ Plan and Risk Tier are independent concepts. Plan controls platform modules. Risk Tier controls review policy. Never conflate them in UI or documentation.

---

*End of document. Update on every iteration completion.*
