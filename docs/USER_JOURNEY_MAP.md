# Clifton Ruskin — User Journey Map

> **Purpose:** Step-by-step walkthrough of what each persona sees, does, and when their workflows intersect.
> Last updated: 2026-02-28.
> Cross-reference: `docs/PLATFORM_STATE_AND_ROADMAP.md` (modules & permissions), `docs/FLOW_CONFIRMATION_PACK.md` (implementation validation).

---

## How to Read This Document

Each section follows a persona through the platform **in order** — what they see first, what they do next, and when their actions trigger work for another role. Cross-role handoffs are marked with **→ HANDOFF** callouts.

---

## 1. CLIENT JOURNEY (Client Admin / Client Requester)

### 1.1 First Login & Orientation

| Step | Page | What the User Sees | What They Do |
|---|---|---|---|
| 1 | `/auth` | Login / signup form | Authenticate with email + password |
| 2 | `/dashboard` | **Dashboard** — entity map, review timeline, active cases, actions required, plan utilisation | Orient themselves; review any pending actions |

**Dashboard cards visible to clients:**
- Entity World Map (geographic spread)
- Review Timeline (upcoming & overdue reviews)
- Active Cases summary
- Actions Required (items needing attention)
- Plan Utilisation (notes used / limit)
- Approvals Summary (Client Admin only)
- Risk Distribution chart
- Programme Health indicator

### 1.2 Register Entities

| Step | Page | What the User Sees | What They Do |
|---|---|---|---|
| 3 | `/entities` | **Entity Register** — table of all entities in their org | Click "Add Entity" to create a new entity |
| 4 | `/entities` (form) | Entity creation form: name, type, country, registration number, risk tier | Fill in entity details and save |
| 5 | `/entities/:id` | **Entity Detail** — tabs: Profile, Overview, Activity, Review Cycle, Deliverables | Review entity profile; set up contacts, addresses, operating countries |

**Entity Detail tabs available to clients:**
| Tab | What It Shows | Gated? |
|---|---|---|
| Profile | Core entity data, contacts, addresses | No |
| Overview | Risk tier, case history summary, jurisdiction links | No |
| Activity | Audit timeline of actions on this entity | No |
| Review Cycle | Next review date, cadence, last review | No |
| Deliverables | Reports delivered for this entity | No |
| Ownership & Structure | Ownership tree, network graph | 🔒 Feature flag: `ownership_structure_intelligence` |
| Monitoring | Change logs, monitoring events | 🔒 Feature flag: `monitoring_module` |
| Jurisdiction Benchmark | Country risk comparison | 🔒 Feature flag: `jurisdiction_benchmark` |
| Commercial Posture | Commercial standing workbench | Enhancement module (per-case) |

### 1.3 Set Up Policies (Client Admin Only)

| Step | Page | What the User Sees | What They Do |
|---|---|---|---|
| 6 | `/policies` | **Policies & Risk Matrix** — review frequency rules, monitoring levels by risk tier | Configure review cadence per risk tier (e.g., Tier A = annual, Tier B = biennial) |
| 7 | `/client/policy` | **Policy Mapping** — custom policy rulesets with if/then logic | Create rules: "If jurisdiction CPI < 40, then require enhanced due diligence" |
| 8 | `/lia-library` | **Master LIA Templates** — Legitimate Interest Assessment templates | Review/create LIA templates for data protection declarations |

### 1.4 Commission a Case

> **Precondition:** At least one entity must exist before a case can be commissioned.

| Step | Page | What the User Sees | What They Do |
|---|---|---|---|
| 9 | `/commission` | **Commission Wizard** — 8-step flow | Walk through the wizard: |
| 9a | Step 1: Select Entity | List of org entities | Pick the entity to investigate |
| 9b | Step 2: Product | Assurance Note / Assurance Dossier / Refresh Note | Choose product type |
| 9c | Step 3: Priority | Standard / Rush | Set urgency |
| 9d | Step 4: Enhancements | Optional add-on modules (Commercial Posture, Jurisdiction Benchmark) | Select any enhancements (gated by entitlements) |
| 9e | Step 5: DP Declaration | Data protection assessment — categories, lawful basis, special categories | Declare data handling requirements |
| 9f | Step 6: Scope Notes | Free-text instructions | Provide specific instructions for the investigation |
| 9g | Step 7: Estimate | Auto-calculated price based on product + priority + enhancements | Review cost estimate |
| 9h | Step 8: Review & Submit | Summary of all selections | Submit — case created with status `scheduled` |

**→ HANDOFF: Case lands in CR Manager's queue** (status: `scheduled`). Manager sees it on `/cases`.

### 1.5 Approve Quotes (Client Admin Only)

| Step | Page | What the User Sees | What They Do |
|---|---|---|---|
| 10 | `/approvals` | **Approvals Queue** — cases with status `submitted` awaiting approval | Review quote details (price, scope, tier) |
| 11 | `/approvals` | Approve / Reject buttons | Approve → status becomes `approved`; Reject → status becomes `cancelled` |

**Auto-approval:** If the org has auto-approval rules configured (`/approval-settings`), low-value standard cases may skip this step entirely.

**→ HANDOFF: Approved case returns to CR Manager** for assignment.

### 1.6 Respond to Queries & Review Deliverables

| Step | Page | What the User Sees | What They Do |
|---|---|---|---|
| 12 | `/cases/:id` | **Case Detail** — case messages (client channel), status timeline | Respond to analyst questions; provide requested documents |
| 13 | `/cases/:id` | Status changes to `awaiting_client` when CR needs input | Provide information → CR resumes work |
| 14 | `/deliverables` | **Deliverables Library** — completed reports | Download final Assurance Note / Dossier |
| 15 | `/cases/:id` | Status: `delivered` | Client Admin closes the case → status `closed` |

### 1.7 Ongoing Activities

| Page | Purpose | Frequency |
|---|---|---|
| `/dashboard` | Monitor programme health, upcoming reviews, alerts | Daily/weekly |
| `/monitoring` | Review monitoring events and change logs (if enabled) | As alerts arrive |
| `/client/alerts` | Jurisdiction-level alerts for subscribed countries | As alerts arrive |
| `/audit-log` | Review audit trail of all actions | As needed |
| `/methodology` | Reference: CR's risk methodology documentation | As needed |
| `/support` | Contact support | As needed |

### 1.8 Admin Activities (Client Admin Only)

| Page | Purpose |
|---|---|
| `/org-settings` | Organisation name, details, preferences |
| `/approval-settings` | Auto-approval rules (thresholds, tier exceptions) |
| `/budget-controls` | Budget limits and tracking |
| `/work-orders` | Work order management |
| `/spend-summary` | Financial overview of all cases and spend |
| `/client/onboarding` | Onboarding wizard for new setup |

---

## 2. CR MANAGER JOURNEY (Assurance Manager / Ops Admin)

### 2.1 First Login & Orientation

| Step | Page | What the User Sees | What They Do |
|---|---|---|---|
| 1 | `/auth` | Login form | Authenticate |
| 2 | `/dashboard` | **Manager Dashboard** — cross-client view with all active cases, workload metrics, SLA tracking | Review operational overview across all clients |

**Manager dashboard includes:**
- All active cases across all orgs
- SLA compliance metrics
- Officer workload distribution
- Pending approvals summary
- Risk coverage overview

### 2.2 Receive & Quote New Cases

> **← HANDOFF from Client:** Case arrives with status `scheduled`.

| Step | Page | What the User Sees | What They Do |
|---|---|---|---|
| 3 | `/cases` | **All Cases** — full queue across all clients, filterable by status/client/priority | Spot new `scheduled` cases |
| 4 | `/cases/:id` | **Case Detail** — Quote Panel | Generate quote: review scope, set price, add notes |
| 5 | `/cases/:id` | Submit quote | Status: `scheduled` → `quoted` → `submitted` |

**→ HANDOFF: Quote goes to Client Admin** for approval at `/approvals`.

### 2.3 Assign Officers

> **← HANDOFF from Client:** Case approved — status `approved`.

| Step | Page | What the User Sees | What They Do |
|---|---|---|---|
| 6 | `/cases/:id` | Assign panel | Select officer, set due date, configure SLA |
| 7 | `/cases/:id` | Confirm assignment | Status: `approved` → `assigned` |

**→ HANDOFF: Case appears on CR Officer's** "My Cases" at `/cases`.

### 2.4 Oversee Execution

| Step | Page | What the User Sees | What They Do |
|---|---|---|---|
| 8 | `/cases` | Filter by `in_progress`, `awaiting_client` | Monitor progress across all active cases |
| 9 | `/workload` | **Workload View** — Gantt chart, calendar swimlane, officer capacity | Balance workload, spot bottlenecks |
| 10 | `/cases/:id` | Case messages (internal channel), task board, evidence locker | Review officer work, provide guidance |

### 2.5 QC & Delivery

> **← HANDOFF from Officer:** Case submitted to QC — status `qc`.

| Step | Page | What the User Sees | What They Do |
|---|---|---|---|
| 11 | `/qa-queue` | **Reports QA Queue** — cases awaiting quality review | Assign QC reviewer or review themselves |
| 12 | `/cases/:id` | QC panel — approve or return to officer | Approve → create deliverable → status `delivered` |

**→ HANDOFF: Deliverable appears in Client's** `/deliverables`.

### 2.6 Platform Administration

| Page | Purpose |
|---|---|
| `/master-entities` | **Master Entity Register** — all entities across all clients |
| `/programme-settings` | Programme-level configuration |
| `/partner-directory` | Manage partner network |
| `/reconciliation` | Entity reconciliation tasks |
| `/risk-model` | Risk model configuration |
| `/tier-matrix` | Tier requirements matrix |
| `/feature-controls` | Enable/disable feature flags per org |
| `/upgrade-requests` | Review and resolve client upgrade requests |
| `/jurisdiction-library` | Manage jurisdiction profiles and risk data |
| `/jurisdictions` | Jurisdiction list and search |
| `/source-registry` | Data source registry |
| `/ingestion-sources` | Ingestion pipeline management |
| `/admin/sources` | Admin source configuration |
| `/admin/ingestion-runs` | Ingestion run history |
| `/admin/sanctions-regimes` | Sanctions regime management |
| `/admin/methodology` | Methodology content editor |
| `/admin/market-lessons` | Market lessons management |
| `/unit-economics` | Unit economics dashboard |
| `/commercial-dashboard` | Commercial performance |
| `/product-catalogue` | Product catalogue management |
| `/budget-controls` | Budget configuration |
| `/billing-handoff` | Billing handoff management |
| `/entitlement-settings` | Client entitlement configuration |
| `/audit-log` | Full audit log (all orgs, internal events visible) |
| `/lia-library` | LIA template management |

---

## 3. CR OFFICER JOURNEY (Assurance Officer / Analyst)

### 3.1 First Login & Orientation

| Step | Page | What the User Sees | What They Do |
|---|---|---|---|
| 1 | `/auth` | Login form | Authenticate |
| 2 | `/cases` | **My Cases** — only cases assigned to them | Review assigned workload |

> Officers do **not** see a full dashboard. Their entry point is their case queue.

### 3.2 Work Assigned Cases

> **← HANDOFF from Manager:** Case assigned — status `assigned`.

| Step | Page | What the User Sees | What They Do |
|---|---|---|---|
| 3 | `/cases/:id` | **Case Detail** — full investigation workspace | Begin work → status: `assigned` → `in_progress` |
| 4 | `/cases/:id` | **Tabs:** Scope & Mandate, Task Board, Research, Partner Engagement, Evidence Locker, QA & Release | |
| 4a | Task Board | Kanban/list of case tasks with dependencies | Create tasks, track progress, manage dependencies |
| 4b | Research | Entity lookup, jurisdiction data, source viewer | Conduct research, log sources |
| 4c | Partner Engagement | Create and manage partner tasks | Send tasks to partners, review partner submissions |
| 4d | Evidence Locker | Secure document storage | Upload evidence, manage attachments |
| 4e | Case Messages | Dual-channel: internal (CR only) + client-facing | Communicate with team and client |

### 3.3 Interact with Client

| Step | Page | What the User Sees | What They Do |
|---|---|---|---|
| 5 | `/cases/:id` | Need information from client | Set status → `awaiting_client`; send message on client channel |

**→ HANDOFF: Client sees status change** and responds at `/cases/:id`.

| 6 | `/cases/:id` | Client responds | Resume work → status back to `in_progress` |

### 3.4 Engage Partners

| Step | Page | What the User Sees | What They Do |
|---|---|---|---|
| 7 | `/partner-requests` | **Partner Requests** — tasks sent to external partners | Create partner task with scope and deadline |

**→ HANDOFF: Partner sees task** at `/partner/tasks/:id` (partners have their own isolated view).

| 8 | `/partner-requests` | Partner submits evidence | Review partner submission, promote evidence if appropriate |

### 3.5 Submit to QC

| Step | Page | What the User Sees | What They Do |
|---|---|---|---|
| 9 | `/cases/:id` | Work complete | Submit to QC → status: `in_progress` → `qc` |

**→ HANDOFF: Case appears in Manager's** `/qa-queue`.

> Officers **cannot** approve QC, deliver reports, or close cases. These are Manager-only actions.

### 3.6 Supporting Tools

| Page | Purpose |
|---|---|
| `/my-tasks` | Personal task list across all assigned cases |
| `/entities` | **Entity Lookup** — search entities (scoped view) |
| `/knowledge-base` | Reference materials and procedures |
| `/research-console` | Research tools and source access |
| `/jurisdiction-library` | Jurisdiction risk profiles |
| `/jurisdictions` | Jurisdiction search |
| `/qa-queue` | "Submitted to QA" — view cases they've submitted |

---

## 4. CROSS-ROLE WORKFLOW MAP

This diagram shows how the three personas interact across the full case lifecycle:

```
CLIENT                          CR MANAGER                       CR OFFICER
───────                         ──────────                       ──────────

1. Create Entity
   └─ /entities
2. Set Policies
   └─ /policies
3. Commission Case
   └─ /commission
   │
   ├──── HANDOFF ──────────► 4. Receive & Quote
   │                            └─ /cases/:id
   │                            │
   │◄──── HANDOFF ─────────── 5. Submit Quote
   │                               (→ submitted)
   │
6. Approve Quote
   └─ /approvals
   │
   ├──── HANDOFF ──────────► 7. Assign Officer
   │                            └─ /cases/:id
   │                            │
   │                            ├──── HANDOFF ──────► 8. Begin Work
   │                            │                        └─ /cases/:id
   │                            │                        │
   │◄─── (awaiting_client) ────────────────────────────── 9. Request Info
   │                            │                        │
  10. Respond ─────────────────────────────────────────► 11. Resume Work
   │                            │                        │
   │                            │                     12. Engage Partner
   │                            │                        └─ /partner-requests
   │                            │                        │    │
   │                            │                        │    └──► PARTNER
   │                            │                        │         (isolated)
   │                            │                        │
   │                            │◄──── HANDOFF ──────── 13. Submit to QC
   │                            │                           (→ qc)
   │                         14. QC Review
   │                            └─ /qa-queue
   │                            │
   │                         15. Approve & Deliver
   │                            (→ delivered)
   │◄──── HANDOFF ──────────    │
   │                            │
  16. Download Report
   └─ /deliverables
   │
  17. Close Case
   └─ /cases/:id
      (→ closed)
```

---

## 5. KEY NAVIGATION DIFFERENCES BY ROLE

### 5.1 What Each Role Sees in the Sidebar

| Nav Item | Client Admin | Client Requester | CR Manager | CR Officer |
|---|---|---|---|---|
| Dashboard | ✅ | ✅ | ✅ (Manager view) | ❌ |
| Entities | ✅ | ✅ | ❌ (uses Master Entities) | ✅ (Entity Lookup) |
| Commission | ✅ | ✅ | ❌ | ❌ |
| Service Request | ✅ | ✅ | ❌ | ❌ |
| Approvals | ✅ | ❌ | ❌ | ❌ |
| Deliverables | ✅ | ✅ | ❌ | ❌ |
| Monitoring | ✅ | ✅ | ❌ | ❌ |
| Policies | ✅ | ✅ | ❌ | ❌ |
| LIA Library | ✅ | ✅ | ✅ | ❌ |
| All Cases | ❌ | ❌ | ✅ | ❌ |
| My Cases | ❌ | ❌ | ❌ | ✅ |
| My Tasks | ❌ | ❌ | ❌ | ✅ |
| Workload View | ❌ | ❌ | ✅ | ❌ |
| Master Entities | ❌ | ❌ | ✅ | ❌ |
| QA Queue | ❌ | ❌ | ✅ | ✅ (submitted only) |
| Partner Directory | ❌ | ❌ | ✅ | ❌ |
| Partner Requests | ❌ | ❌ | ❌ | ✅ |
| Knowledge Base | ❌ | ❌ | ❌ | ✅ |
| Research Console | ❌ | ❌ | ❌ | ✅ |
| Feature Controls | ❌ | ❌ | ✅ | ❌ |
| Upgrade Requests | ❌ | ❌ | ✅ | ❌ |
| Audit Log | ✅ | ✅ | ✅ | ❌ |
| Org Settings | ✅ | ❌ | ❌ | ❌ |
| Budget & Spend | ✅ | ❌ | ✅ | ❌ |

### 5.2 First Screen After Login

| Role | First Screen | Primary Action |
|---|---|---|
| Client Admin | `/dashboard` | Review programme health, check pending approvals |
| Client Requester | `/dashboard` | Review entity status, commission new case |
| CR Manager | `/dashboard` (Manager view) | Review cross-client workload, quote new cases |
| CR Officer | `/cases` (My Cases) | Pick up assigned case, begin or continue work |

---

## 6. LIFECYCLE SUMMARY (One-Line View)

```
Register Entity → Set Policies → Commission → Quote → Approve → Assign → Execute → QC → Deliver → Close → Monitor → Refresh
     CLIENT          CLIENT        CLIENT      MGR      CLIENT    MGR      OFFICER   MGR    MGR      CLIENT   CLIENT    CLIENT
```

**Refresh cycle:** When the next review date arrives, the cadence scheduler prompts the client to re-commission, restarting the cycle from "Commission."

---

*End of User Journey Map. Update whenever navigation, permissions, or workflow steps change.*
