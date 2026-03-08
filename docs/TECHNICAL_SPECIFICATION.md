# Clifton Ruskin Assurance Portal — Complete Technical Specification

> **Generated:** 2026-03-08  
> **Application:** Clifton Ruskin Assurance Portal  
> **Stack:** React 18 + Vite + TypeScript + Tailwind CSS + Supabase (Lovable Cloud)  
> **Purpose:** Multi-tenant investigative assurance platform for entity due diligence, jurisdiction risk assessment, and regulatory compliance reporting.

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Authentication & Role-Based Access Control](#2-authentication--role-based-access-control)
3. [Data Models (Complete Schema)](#3-data-models-complete-schema)
4. [Feature Modules](#4-feature-modules)
5. [User Workflows (Step-by-Step)](#5-user-workflows-step-by-step)
6. [Risk Scoring & Calculation Logic](#6-risk-scoring--calculation-logic)
7. [Edge Functions (Backend Logic)](#7-edge-functions-backend-logic)
8. [Third-Party Integrations](#8-third-party-integrations)
9. [Database Functions & Triggers](#9-database-functions--triggers)
10. [Enumerations & Constants](#10-enumerations--constants)
11. [Storage Buckets](#11-storage-buckets)
12. [Complete File & Component List](#12-complete-file--component-list)
13. [Routing Map](#13-routing-map)
14. [Feature Flags & Entitlements](#14-feature-flags--entitlements)

---

## 1. Architecture Overview

### Frontend
- **Framework:** React 18.3 with TypeScript
- **Build:** Vite
- **Styling:** Tailwind CSS with semantic design tokens, shadcn/ui component library
- **Routing:** React Router DOM v6 (client-side SPA)
- **State:** React Context (AuthContext, ViewModeContext), TanStack React Query for server state
- **Charts:** Recharts, D3.js (ownership network graphs)
- **Maps:** Leaflet / React-Leaflet (entity geolocation)
- **Notifications:** Sonner + shadcn Toast

### Backend (Lovable Cloud / Supabase)
- **Database:** PostgreSQL with Row-Level Security (RLS)
- **Auth:** Supabase Auth (email/password)
- **Edge Functions:** Deno-based serverless functions (auto-deployed)
- **Storage:** Three private buckets (deliverables, partner-evidence, case-evidence)
- **Realtime:** Supabase Realtime (available, used for alert notifications)

### Multi-Tenancy
- All data is scoped by `org_id` (organisation)
- RLS policies enforce tenant isolation at the database level
- `get_user_org_id()` security definer function provides safe org lookup

---

## 2. Authentication & Role-Based Access Control

### Authentication Flow
1. User navigates to `/auth`
2. Email/password sign-up or sign-in
3. `handle_new_user()` trigger auto-creates a `profiles` record
4. Auth state managed via `AuthContext` (listens to `onAuthStateChange`)
5. Roles loaded from `user_roles` table on login

### Role Hierarchy

| Role (DB Enum) | Category | Display Label | Description |
|---|---|---|---|
| `fvc_ops_admin` | Platform | Operations Admin | Full platform access, data source management, global config |
| `fvc_assurance_lead` | Internal | Assurance Lead | QC sign-off authority |
| `fvc_quality_reviewer` | Internal | Quality Reviewer | QC sign-off authority |
| `fvc_assurance_manager` | Internal | Assurance Manager | Case quoting, officer assignment, case closure, global visibility |
| `fvc_assurance_officer` | Internal | Assurance Officer | Works assigned cases, creates partner tasks |
| `fvc_analyst` | Internal (Legacy) | Analyst | Same permissions as officer |
| `client_admin` | Client | Client Admin | Org settings, policies, approvals, user management |
| `client_requester` | Client | Client Requester | Entity management, commissioning |
| `client_auditor` | Client | Client Auditor | Read-only access to entities and deliverables |
| `partner` | External | Partner | Isolated portal for partner task completion |

### Permission Matrix

| Capability | Ops Admin | Manager | Lead | QR | Officer | Analyst | Client Admin | Client Req | Client Aud | Partner |
|---|---|---|---|---|---|---|---|---|---|---|
| Quote & Scope | ✅ | ✅ | | | | | | | | |
| Assign Officers | ✅ | ✅ | | | | | | | | |
| Work Cases | ✅ | ✅ | | | ✅ | ✅ | | | | |
| Create Partner Tasks | ✅ | ✅ | | | ✅ | ✅ | | | | |
| QC Sign-off | ✅ | | ✅ | ✅ | | | | | | |
| Close Cases | ✅ | ✅ | | | | | | | | |
| Adjust Due Dates | ✅ | ✅ | | | | | | | | |
| View Ownership | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | |
| Export Ownership | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | | |
| Toggle Provenance | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | | | | |
| Edit Relationships | ✅ | ✅ | | | | | ✅ | | | |
| Manage Ingestion | ✅ | | | | | | | | | |
| View Raw Sanctions | ✅ | ✅ | | | | | | | | |

### Route Guards
- `ProtectedRoute`: Requires authenticated user
- `InternalRouteGuard`: Requires internal role (any `fvc_*` role)
- `InternalRouteGuard managerOnly`: Requires `fvc_assurance_manager` or `fvc_ops_admin`
- `PartnerLayout`: Isolated layout for partner portal

### View Mode Toggle
Internal users who also have client roles can toggle between "Client View" and "CR Internal View" via `ViewModeContext`. This changes sidebar navigation and available features without re-authentication.

---

## 3. Data Models (Complete Schema)

### Core Entities

#### `organisations`
| Field | Type | Notes |
|---|---|---|
| id | uuid PK | |
| name | text | Organisation display name |
| feature_tier | text | Plan tier: A (Premium), B (Standard), C (Essential), custom |
| risk_policy_default_id | uuid FK → policies | Default risk policy |
| approval_price_threshold | numeric | Auto-approval ceiling |
| *other fields* | | Billing, contact, settings |

#### `profiles`
| Field | Type | Notes |
|---|---|---|
| id | uuid PK | |
| user_id | uuid | References auth.users (no FK constraint) |
| org_id | uuid FK → organisations | Nullable |
| full_name | text | |
| email | text | |
| created_at | timestamptz | |

#### `user_roles`
| Field | Type | Notes |
|---|---|---|
| id | uuid PK | |
| user_id | uuid | References auth.users |
| role | app_role enum | One of 10 defined roles |
| *(unique: user_id, role)* | | |

#### `entities`
| Field | Type | Notes |
|---|---|---|
| id | uuid PK | |
| org_id | uuid FK → organisations | Tenant scoping |
| name | text | Entity legal name |
| entity_type | text | e.g. Corporate, Individual, Trust |
| status | text | Active, Inactive, etc. |
| risk_tier | text | A, B, C risk classification |
| criticality | text | Critical, High, Standard |
| country | text | Legacy country field |
| incorporation_country_code | text | ISO country code (INC) |
| incorporation_country_name | text | |
| hq_country_code | text | ISO country code (HQ) |
| hq_country_name | text | |
| hq_lat / hq_lng | float | HQ geolocation |
| registered_address_* | text | Full registered address fields (line1, line2, city, region, postcode, country) |
| registered_lat / registered_lng | float | Registered office geolocation |
| head_office_address_* | text | Full head office address fields |
| registration_number | text | Company registration number |
| website | text | |
| poc_name / poc_email / poc_phone | text | Point of contact |
| owner_user_id | uuid | Internal owner |
| business_unit | text | |
| service_provided | text | |
| data_access_level | text | |
| payment_terms | text | |
| contract_renewal_date | date | |
| internal_contacts | jsonb | |
| onboarded_date | date | |
| last_review_date | date | |
| next_review_date | date | |
| master_entity_id | uuid FK → master_entities | Dedup link |
| has_master_conflict | boolean | Data mismatch flag |
| created_at | timestamptz | |

#### `master_entities`
| Field | Type | Notes |
|---|---|---|
| id | uuid PK | |
| canonical_name | text | Authoritative name |
| canonical_registration_number | text | |
| created_at | timestamptz | |

### Case Management

#### `cases`
| Field | Type | Notes |
|---|---|---|
| id | uuid PK | |
| org_id | uuid FK → organisations | |
| entity_id | uuid FK → entities | Subject entity |
| status | text | submitted, quoted, approved, in_progress, qa_review, delivered, closed |
| case_type | text | |
| product_type | text | Assurance Note, Assurance Dossier, Emergency Note |
| report_tier | text | Core, Enhanced, Premium |
| priority | text | standard, rush |
| price_estimate | numeric | |
| due_date | date | |
| sla_days | integer | |
| assigned_to | uuid | Officer assignment |
| qa_owner | uuid | QA reviewer |
| requested_by | uuid | Client who commissioned |
| approved_by | uuid | Approver |
| scope_notes | text | |
| internal_notes | text | |
| scope_change_flag | boolean | LIA deviation signal |
| scope_change_resolved | boolean | |
| requires_personal_data | boolean | |
| dp_review_required | boolean | |
| dp_risk_level | text | low, medium, high |
| processing_purpose | text | |
| processing_purpose_detail | text | |
| lawful_basis | text | |
| data_categories | jsonb | |
| minimisation_confirmed | boolean | |
| retention_months | integer | |
| lia_summary | text | |
| active_lia_id | uuid FK → master_lia_templates | |
| structured_source_log | jsonb | |
| created_at | timestamptz | |

#### `case_tasks`
| Field | Type | Notes |
|---|---|---|
| id | uuid PK | |
| case_id | uuid FK → cases | |
| title | text | |
| description | text | |
| status | text | todo, in_progress, done |
| owner_id | uuid | Assigned officer |
| due_date | date | |
| dependencies | uuid[] | Blocked-by task IDs |
| attachments | jsonb | |
| linked_retrieval_logs | uuid[] | |
| created_by | uuid | |
| created_at / updated_at | timestamptz | |

#### `case_modules`
| Field | Type | Notes |
|---|---|---|
| id | uuid PK | |
| case_id | uuid FK → cases | |
| module_type_id | uuid FK → module_types | |
| status | text | |
| price_estimate | numeric | |
| requested_by / approved_by | uuid | |
| created_at | timestamptz | |

#### `case_messages`
| Field | Type | Notes |
|---|---|---|
| id | uuid PK | |
| case_id | uuid FK → cases | |
| sender_user_id | uuid | |
| message | text | |
| channel | text | internal, client — dual-thread isolation |
| attachments | jsonb | |
| created_at | timestamptz | |

#### `case_dp_declarations`
| Field | Type | Notes |
|---|---|---|
| id | uuid PK | |
| case_id | uuid FK → cases | |
| org_id | uuid FK → organisations | |
| purpose | text | |
| data_categories | jsonb | |
| sensitive_special_category | boolean | |
| sensitive_criminal_offence | boolean | |
| minimisation_confirmed | boolean | |
| retention_months | integer | |
| master_lia_id | uuid FK → master_lia_templates | |
| requires_approval | boolean | |
| approval_reasons | jsonb | |
| created_at | timestamptz | |

### Quoting & Commercial

#### `quotes`
| Field | Type | Notes |
|---|---|---|
| id | uuid PK | |
| case_id | uuid FK → cases | |
| org_id | uuid FK → organisations | |
| status | text | draft, sent, approved, rejected |
| line_items_json | jsonb | Itemised pricing |
| discount_percent | numeric | |
| vat_rate | numeric | |
| total_net / total_gross | numeric | |
| valid_until | date | |
| approved_at | timestamptz | |
| approved_by | uuid | |
| created_by | uuid | |
| created_at / updated_at | timestamptz | |

#### `quote_line_items`
| Field | Type | Notes |
|---|---|---|
| id | uuid PK | |
| quote_id | uuid FK → quotes | |
| product_id | uuid FK → products | |
| description | text | |
| quantity | integer | |
| unit_price | numeric | |
| line_total | numeric | |
| sort_order | integer | |

#### `work_orders`
| Field | Type | Notes |
|---|---|---|
| id | uuid PK | |
| case_id | uuid FK → cases | |
| org_id | uuid FK → organisations | |
| quote_id | uuid FK → quotes | |
| total_value | numeric | |
| partner_cost | numeric | |
| assigned_officer | uuid | |
| delivery_status | text | |
| delivery_date | date | |
| invoice_status | text | |
| external_invoice_reference | text | |
| qa_required | boolean | |
| notes | text | |
| created_at / updated_at | timestamptz | |

#### `products`
| Field | Type | Notes |
|---|---|---|
| id | uuid PK | |
| product_name | text | |
| product_type | text | |
| description | text | |
| base_price | numeric | |
| pricing_unit | text | |
| vat_applicability | text | |
| sla_default_days | integer | |
| included_in_packages | text[] | Package entitlement gating |
| jurisdiction_pricing_modifier | jsonb | |
| internal_delivery_notes | text | |
| enabled | boolean | |
| created_at / updated_at | timestamptz | |

#### `programme_budgets`
| Field | Type | Notes |
|---|---|---|
| id | uuid PK | |
| org_id | uuid FK → organisations | |
| period_type | text | annual, quarterly |
| period_start / period_end | date | |
| total_cap | numeric | |
| committed_spend | numeric | |
| delivered_spend | numeric | |
| partner_spend | numeric | |
| cap_behaviour | text | warn, block |
| criticality_caps | jsonb | Per-criticality spending limits |
| jurisdiction_caps | jsonb | Per-jurisdiction spending limits |
| notes | text | |
| created_by | uuid | |
| created_at / updated_at | timestamptz | |

#### `budget_overrides`
| Field | Type | Notes |
|---|---|---|
| id | uuid PK | |
| budget_id | uuid FK → programme_budgets | |
| case_id | uuid FK → cases | |
| override_amount | numeric | |
| justification | text | |
| override_by | uuid | |
| created_at | timestamptz | |

#### `billing_events`
| Field | Type | Notes |
|---|---|---|
| id | uuid PK | |
| org_id | uuid FK → organisations | |
| entity_id | uuid FK → entities | |
| case_id | uuid FK → cases | |
| event_type | text | |
| feature_key | text | |
| metadata | jsonb | |
| performed_by | uuid | |
| created_at | timestamptz | |

### Jurisdiction Intelligence

#### `jurisdiction`
| Field | Type | Notes |
|---|---|---|
| id | uuid PK | |
| country_code | text | ISO 3166-1 alpha-2 |
| country_name | text | |
| last_refreshed_at | timestamptz | |
| created_at / updated_at | timestamptz | |

#### `jurisdiction_alias`
| Field | Type | Notes |
|---|---|---|
| id | uuid PK | |
| jurisdiction_id | uuid FK → jurisdiction | |
| alias_name | text | e.g. "UK", "USA", "Russian Federation" |
| source_name | text | |
| created_at | timestamptz | |

#### `jurisdiction_indicator`
| Field | Type | Notes |
|---|---|---|
| id | uuid PK | |
| jurisdiction_id | uuid FK → jurisdiction | |
| indicator_type | indicator_type enum | FATF_STATUS, EU_AML_HRTC, CPI_SCORE, SANCTIONS_* |
| value_json | jsonb | Structured indicator data |
| source_name | text | |
| source_url | text | |
| source_snapshot_hash | text | Integrity verification |
| effective_date | date | When indicator became effective |
| retrieved_at | timestamptz | When data was fetched |
| ingestion_run_id | uuid FK → ingestion_run | |
| created_at / updated_at | timestamptz | |

#### `jurisdiction_indicator_change`
| Field | Type | Notes |
|---|---|---|
| id | uuid PK | |
| jurisdiction_id | uuid FK → jurisdiction | |
| jurisdiction_indicator_id | uuid FK → jurisdiction_indicator | |
| indicator_type | indicator_type enum | |
| old_value_json / new_value_json | jsonb | Before/after comparison |
| old_effective_date / new_effective_date | text | |
| source_name / source_url | text | |
| source_snapshot_hash | text | |
| ingestion_run_id | uuid FK → ingestion_run | |
| acknowledged | boolean | |
| acknowledged_by | uuid | |
| acknowledged_at | timestamptz | |
| detected_at | timestamptz | |

#### `jurisdiction_change_impact`
| Field | Type | Notes |
|---|---|---|
| id | uuid PK | |
| alert_event_id | uuid FK → alert_event | |
| entity_id | uuid FK → entities | |
| jurisdiction_id | uuid FK → jurisdiction | |
| org_id | uuid FK → organisations | |
| case_id | uuid FK → cases | |
| impact_type | impact_type enum | POLICY_TRIGGER, CR_SCORE_CHANGE, MONITORING_ALERT |
| impact_summary | text | |
| created_at | timestamptz | |

#### `jurisdiction_profiles`
| Field | Type | Notes |
|---|---|---|
| id | uuid PK | |
| country_code / country_name | text | |
| incorporation_regime_summary | text | |
| beneficial_ownership_transparency_level | text | |
| public_registry_depth | text | |
| enforcement_environment_notes | text | |
| sanctions_exposure_notes | text | |
| source_availability_notes | text | |
| created_by | uuid | |
| created_at / updated_at | timestamptz | |

#### `jurisdiction_updates`
| Field | Type | Notes |
|---|---|---|
| id | uuid PK | |
| jurisdiction_id | uuid FK → jurisdiction_profiles | |
| title | text | |
| category | text | |
| factual_summary | text | |
| internal_source_reference | text | |
| update_date | date | |
| created_by | uuid | |
| created_at | timestamptz | |

### Entity–Jurisdiction Linking

#### `entity_jurisdiction_link`
| Field | Type | Notes |
|---|---|---|
| id | uuid PK | |
| entity_id | uuid FK → entities | |
| jurisdiction_id | uuid FK → jurisdiction | |
| link_type | jurisdiction_link_type enum | INCORPORATION, OPERATIONS, UBO_NATIONALITY, BANK_LOCATION, SUPPLIER_LOCATION, SHIPPING_ROUTE, OTHER |
| confidence | link_confidence enum | CONFIRMED, LIKELY, UNCONFIRMED |
| source | text | |
| notes | text | |
| created_by | uuid | |
| created_at | timestamptz | |

#### `entity_operating_countries`
| Field | Type | Notes |
|---|---|---|
| id | uuid PK | |
| entity_id | uuid FK → entities | |
| country_code / country_name | text | |
| confidence | text | Confirmed, Likely, Unconfirmed |
| source | text | |
| added_by | uuid | |
| created_at | timestamptz | |

### Entity Relationships (Ownership)

#### `entity_relationships`
| Field | Type | Notes |
|---|---|---|
| id | uuid PK | |
| source_entity_id | uuid FK → entities | Parent/owner |
| target_entity_id | uuid FK → entities | Child/subsidiary |
| relationship_type | text | ownership, director, operational |
| percentage | numeric | Ownership percentage |
| confidence_level | text | |
| source_reference | text | |
| effective_from_date / effective_to_date | date | |
| last_verified_date | date | |
| created_at | timestamptz | |

### Risk Scoring

#### `entity_risk_scores`
| Field | Type | Notes |
|---|---|---|
| id | uuid PK | |
| entity_id | uuid FK → entities | |
| overall_score | numeric | 0–100 |
| jurisdiction_score | numeric | Pillar 1 |
| structural_score | numeric | Pillar 2 |
| association_score | numeric | Pillar 3 |
| event_score | numeric | Pillar 4 |
| risk_band | text | Low, Medium, High, Critical |
| reason_codes | jsonb | |
| confidence | text | |
| model_version | text | |
| calculated_by | uuid | |
| calculated_at | timestamptz | |

#### `risk_model_configs`
| Field | Type | Notes |
|---|---|---|
| id | uuid PK | |
| version | text | |
| is_active | boolean | |
| jurisdiction_weight | numeric | Pillar weights (sum to 1.0) |
| structural_weight | numeric | |
| association_weight | numeric | |
| event_weight | numeric | |
| band_low_max | numeric | Band threshold boundaries |
| band_medium_max | numeric | |
| band_high_max | numeric | |
| notes | text | |
| created_by | uuid | |
| created_at | timestamptz | |

#### `risk_overrides`
| Field | Type | Notes |
|---|---|---|
| id | uuid PK | |
| entity_id | uuid FK → entities | |
| previous_band / new_band | text | |
| justification | text | Required |
| overridden_by | uuid | |
| created_at | timestamptz | |

#### `cr_risk_engine_config`
| Field | Type | Notes |
|---|---|---|
| id | uuid PK | |
| engine_version | text | e.g. "CR-JURIS-1.0" |
| enabled | boolean | |
| weights_json | jsonb | Indicator scoring weights |
| thresholds_json | jsonb | Band boundary thresholds |
| created_at | timestamptz | |

#### `cr_risk_result`
| Field | Type | Notes |
|---|---|---|
| id | uuid PK | |
| entity_id | uuid FK → entities | |
| jurisdiction_id | uuid FK → jurisdiction | |
| risk_score | numeric | 0–100 |
| risk_band | cr_risk_band enum | LOW, MEDIUM, HIGH, SEVERE |
| engine_version | text | |
| contributing_factors_json | jsonb | Detailed factor breakdown |
| recommended_controls_json | jsonb | EDD, SOW/SOF, etc. |
| generated_at | timestamptz | |

### Sanctions

#### `sanctions_entity`
| Field | Type | Notes |
|---|---|---|
| id | uuid PK | |
| source | sanctions_source enum | UKSL, OFAC, EU_FSF |
| list_name | text | |
| name | text | Designated person/entity name |
| entity_type | text | Individual, Entity |
| source_record_id | text | Authority's unique ID |
| active | boolean | Soft-delete support |
| country_json | jsonb | |
| addresses_json | jsonb | |
| dob_json | jsonb | |
| identifiers_json | jsonb | |
| programmes_json | jsonb | |
| raw_json | jsonb | Full raw record |
| first_seen_at / last_seen_at | timestamptz | |
| ingestion_run_id | uuid FK → ingestion_run | |
| created_at / updated_at | timestamptz | |

#### `sanctions_entity_change`
| Field | Type | Notes |
|---|---|---|
| id | uuid PK | |
| sanctions_entity_id | uuid FK → sanctions_entity | |
| change_type | text | ADDED, REMOVED, MODIFIED |
| old_json / new_json | jsonb | |
| ingestion_run_id | uuid FK → ingestion_run | |
| detected_at | timestamptz | |

#### `sanctions_regime_map`
| Field | Type | Notes |
|---|---|---|
| id | uuid PK | |
| jurisdiction_id | uuid FK → jurisdiction | |
| authority | sanctions_authority enum | UK, EU, US |
| regime_type | sanctions_regime_type enum | TARGETED, COMPREHENSIVE |
| effective_date | date | |
| source_url | text | |
| rationale_text | text | |
| last_reviewed_at | timestamptz | |
| created_at | timestamptz | |

### Alerts & Monitoring

#### `alert_event`
| Field | Type | Notes |
|---|---|---|
| id | uuid PK | |
| alert_type | client_alert_type enum | |
| jurisdiction_id | uuid FK → jurisdiction | |
| indicator_change_id | uuid FK → jurisdiction_indicator_change | |
| summary | text | |
| details_json | jsonb | |
| source_url | text | |
| detected_at | timestamptz | |
| effective_date | date | |
| created_at | timestamptz | |

#### `alert_notification`
| Field | Type | Notes |
|---|---|---|
| id | uuid PK | |
| alert_event_id | uuid FK → alert_event | |
| user_id | uuid | |
| org_id | uuid FK → organisations | |
| is_read | boolean | |
| read_at | timestamptz | |
| created_at | timestamptz | |

#### `alert_subscription`
| Field | Type | Notes |
|---|---|---|
| id | uuid PK | |
| org_id | uuid FK → organisations | |
| user_id | uuid | |
| alert_type | client_alert_type enum | |
| jurisdiction_id | uuid FK → jurisdiction | Nullable (null = all) |
| all_linked_jurisdictions | boolean | Auto-subscribe to entity-linked jurisdictions |
| enabled | boolean | |
| created_at / updated_at | timestamptz | |

#### `client_monitored_entity`
| Field | Type | Notes |
|---|---|---|
| id | uuid PK | |
| org_id | uuid FK → organisations | |
| entity_id | uuid FK → entities | |
| enabled | boolean | |
| created_at | timestamptz | |

#### `jurisdiction_alert_subscriptions`
| Field | Type | Notes |
|---|---|---|
| id | uuid PK | |
| jurisdiction_id | uuid FK → jurisdiction | |
| user_id | uuid | |
| indicator_types | text[] | |
| channel | text | |
| is_active | boolean | |
| created_at / updated_at | timestamptz | |

#### `jurisdiction_alerts`
| Field | Type | Notes |
|---|---|---|
| id | uuid PK | |
| jurisdiction_id | uuid FK → jurisdiction | |
| user_id | uuid | |
| title | text | |
| body | text | |
| indicator_type | text | |
| indicator_change_id | uuid FK → jurisdiction_indicator_change | |
| is_read | boolean | |
| created_at | timestamptz | |

### Policies

#### `policies`
| Field | Type | Notes |
|---|---|---|
| id | uuid PK | |
| org_id | uuid FK → organisations | |
| name | text | |
| description | text | |
| is_default | boolean | |
| created_at | timestamptz | |

#### `policy_rules`
| Field | Type | Notes |
|---|---|---|
| id | uuid PK | |
| policy_id | uuid FK → policies | |
| risk_tier | text | A, B, C |
| default_product | text | |
| review_frequency_months | integer | |
| monitoring_level | text | |
| approval_required | boolean | |

#### `client_policy_ruleset`
| Field | Type | Notes |
|---|---|---|
| id | uuid PK | |
| org_id | uuid FK → organisations | |
| name | text | |
| version | integer | |
| enabled | boolean | |
| created_at / updated_at | timestamptz | |

#### `client_policy_rule`
| Field | Type | Notes |
|---|---|---|
| id | uuid PK | |
| ruleset_id | uuid FK → client_policy_ruleset | |
| if_indicator_type | text | Trigger condition |
| operator | policy_operator enum | EQUALS, IN, GTE, LTE, EXISTS, etc. |
| compare_value_json | jsonb | |
| then_outcome_json | jsonb | e.g. { "action": "EDD_REQUIRED" } |
| priority | integer | Rule evaluation order |
| notes | text | |
| created_at | timestamptz | |

#### `client_policy_outcome`
| Field | Type | Notes |
|---|---|---|
| id | uuid PK | |
| org_id | uuid FK → organisations | |
| ruleset_id | uuid FK → client_policy_ruleset | |
| entity_id | uuid FK → entities | |
| case_id | uuid FK → cases | |
| outcome_json | jsonb | |
| engine_version | text | |
| computed_at | timestamptz | |

#### `policy_simulation`
| Field | Type | Notes |
|---|---|---|
| id | uuid PK | |
| org_id | uuid FK → organisations | |
| ruleset_id | uuid FK → client_policy_ruleset | |
| name | text | |
| proposed_rules_json | jsonb | |
| status | text | draft, running, complete |
| created_by | uuid | |
| created_at | timestamptz | |

#### `policy_simulation_result`
| Field | Type | Notes |
|---|---|---|
| id | uuid PK | |
| simulation_id | uuid FK → policy_simulation | |
| entity_id | uuid FK → entities | |
| current_outcome_json | jsonb | Before |
| proposed_outcome_json | jsonb | After |
| has_change | boolean | |
| computed_at | timestamptz | |

### Reports & Deliverables

#### `reports`
(Referenced in types but fields inferred from report workflow components)
- Structured report builder with versioned sections
- Status workflow: DRAFT → IN_REVIEW → APPROVED → ISSUED
- SHA-256 hash on final issuance

#### `report_sections`
| Field | Type | Notes |
|---|---|---|
| id | uuid PK | |
| report_id | uuid FK → reports | |
| section_key | report_section_key enum | EXEC_SUMMARY, JURISDICTION_ANNEX, METHODOLOGY_NOTE |
| structured_data_json | jsonb | |
| officer_commentary | text | |
| ai_draft | text | |
| qa_notes | text | |
| version | integer | |
| created_at / updated_at | timestamptz | |

#### `report_approvals`
| Field | Type | Notes |
|---|---|---|
| id | uuid PK | |
| report_id | uuid FK | |
| status | report_approval_status enum | pending, approved, rejected |
| reviewer_id | uuid | |
| notes | text | |
| created_at | timestamptz | |

#### `deliverables`
| Field | Type | Notes |
|---|---|---|
| id | uuid PK | |
| case_id | uuid FK → cases | |
| title | text | |
| deliverable_type | text | |
| file_url | text | Storage bucket path |
| version | integer | |
| expunged | boolean | GDPR erasure support |
| expunged_at | timestamptz | |
| expunged_by | uuid | |
| created_at | timestamptz | |

#### `expunge_log`
| Field | Type | Notes |
|---|---|---|
| id | uuid PK | |
| org_id | uuid FK → organisations | |
| case_id | uuid FK → cases | |
| deliverable_id | uuid FK → deliverables | |
| deliverable_title | text | |
| entity_name | text | |
| reason | text | |
| expunged_by | uuid | |
| created_at | timestamptz | |

### Data Protection

#### `master_lia_templates`
| Field | Type | Notes |
|---|---|---|
| id | uuid PK | |
| org_id | uuid FK → organisations | |
| title | text | |
| status | text | active, draft, superseded |
| version | integer | |
| *lia fields* | | Purpose, categories, subjects, safeguards |
| created_at / updated_at | timestamptz | |

#### `lia_assessments`
| Field | Type | Notes |
|---|---|---|
| id | uuid PK | |
| org_id | uuid FK → organisations | |
| case_id | uuid FK → cases | |
| purpose | text | |
| legitimate_interest | text | |
| necessity | text | |
| data_categories / data_subjects | jsonb | |
| special_category_requested | boolean | |
| criminal_offence_requested | boolean | |
| retention_months | integer | |
| balancing_test_factors | jsonb | |
| safeguards | text | |
| conditions | text | |
| sources | jsonb | |
| outcome | text | |
| status | text | draft, approved, rejected |
| review_date | date | |
| approved_by_user_id | uuid | |
| approved_at | timestamptz | |
| created_by_user_id | uuid | |
| created_at / updated_at | timestamptz | |

#### `lia_exports`
| Field | Type | Notes |
|---|---|---|
| id | uuid PK | |
| lia_id | uuid FK → lia_assessments | |
| case_id | uuid FK → cases | |
| deliverable_id | uuid FK → deliverables | |
| file_url | text | |
| version | integer | |
| created_at | timestamptz | |

#### `data_protection_reviews`
| Field | Type | Notes |
|---|---|---|
| id | uuid PK | |
| case_id | uuid FK → cases | |
| status | text | pending, approved, rejected |
| reviewer_user_id | uuid | |
| notes | text | |
| created_at | timestamptz | |

### Partner Management

#### `partners`
| Field | Type | Notes |
|---|---|---|
| id | uuid PK | |
| name | text | |
| country | text | |
| jurisdictions_covered | text[] | |
| services_offered | text[] | |
| dd_status | text | Due diligence status |
| active | boolean | |
| contact_name / contact_email / contact_phone | text | |
| internal_rating | numeric | |
| rate_structure | text | |
| rate_card | jsonb | |
| sla_terms | text | |
| capability_tags | jsonb | |
| compliance_document_url | text | |
| notes_internal | text | |
| created_at / updated_at | timestamptz | |

#### `partner_tasks`
| Field | Type | Notes |
|---|---|---|
| id | uuid PK | |
| case_module_id | uuid FK → case_modules | |
| entity_id | uuid FK → entities | |
| partner_id | uuid FK → partners | |
| partner_user_id | uuid | |
| title | text | |
| country | text | |
| questions | jsonb | Structured question set |
| method_statement | text | |
| deadline | date | |
| status | text | pending, in_progress, completed |
| response_notes | text | |
| created_by | uuid | |
| created_at / updated_at | timestamptz | |

#### `partner_task_items`
| Field | Type | Notes |
|---|---|---|
| id | uuid PK | |
| task_id | uuid FK → partner_tasks | |
| label | text | |
| description | text | |
| is_completed | boolean | |
| file_name / file_url | text | |
| notes | text | |
| geo_label / geo_lat / geo_lng | text/float | |
| is_client_shareable | boolean | |
| sort_order | integer | |
| created_at / updated_at | timestamptz | |

### Ingestion Pipeline

#### `data_source`
| Field | Type | Notes |
|---|---|---|
| id | uuid PK | |
| name | text | e.g. "FATF Grey List", "UK Sanctions List" |
| source_type | text | |
| urls | text[] | Data source URLs |
| base_url | text | |
| expected_format | text | |
| refresh_cadence | text | daily, weekly, monthly |
| description | text | |
| is_active | boolean | |
| last_run_at | timestamptz | |
| last_run_status | text | |
| created_at | timestamptz | |

#### `ingestion_run`
| Field | Type | Notes |
|---|---|---|
| id | uuid PK | |
| data_source_id | uuid FK → data_source | |
| status | text | running, completed, failed |
| records_processed | integer | |
| records_changed | integer | |
| metadata | jsonb | |
| started_at / finished_at | timestamptz | |

#### `ingestion_error`
| Field | Type | Notes |
|---|---|---|
| id | uuid PK | |
| ingestion_run_id | uuid FK → ingestion_run | |
| error_message | text | |
| error_detail | jsonb | |
| created_at | timestamptz | |

### Programme Settings

#### `programme_settings`
| Field | Type | Notes |
|---|---|---|
| id | uuid PK | |
| org_id | uuid FK → organisations (1:1) | |
| cadence_tier_a / _b / _c | integer | Review frequency in months per risk tier |
| report_tier_a / _b / _c | text | Default report tier per risk tier |
| addons | jsonb | |
| created_at / updated_at | timestamptz | |

#### `programme_audit_log`
| Field | Type | Notes |
|---|---|---|
| id | uuid PK | |
| org_id | uuid FK → organisations | |
| field_changed | text | |
| old_value / new_value | text | |
| changed_by | uuid | |
| created_at | timestamptz | |

### Auto-Approval

#### `auto_approval_rules`
| Field | Type | Notes |
|---|---|---|
| id | uuid PK | |
| org_id | uuid FK → organisations (1:1) | |
| always_require_tier_a | boolean | |
| always_require_rush | boolean | |
| always_require_dossier | boolean | |
| always_require_dp_high | boolean | |
| always_require_partner_spend | boolean | |
| auto_approve_refresh_up_to | numeric | Max auto-approval amount |
| created_at / updated_at | timestamptz | |

### Audit & Compliance

#### `audit_events`
| Field | Type | Notes |
|---|---|---|
| id | uuid PK | |
| org_id | uuid FK → organisations | |
| user_id | uuid | |
| action_type | text | |
| object_type | text | |
| object_id | uuid | |
| entity_id | uuid FK → entities | |
| case_id | uuid FK → cases | |
| report_id | uuid | |
| event_summary | text | |
| metadata | jsonb | |
| is_internal | boolean | Hidden from client view |
| created_at | timestamptz | |

#### `change_logs`
| Field | Type | Notes |
|---|---|---|
| id | uuid PK | |
| entity_id | uuid FK → entities | |
| case_id | uuid FK → cases | |
| summary | text | |
| what_changed | text | |
| why_it_matters | text | |
| recommended_action | text | |
| confidence_level | text | |
| created_at | timestamptz | |

#### `analyst_time_entries`
| Field | Type | Notes |
|---|---|---|
| id | uuid PK | |
| case_id | uuid FK → cases | |
| org_id | uuid FK → organisations | |
| officer_id | uuid | |
| bucket | text | research, writing, review |
| minutes | integer | |
| entry_date | date | |
| note | text | |
| created_at / updated_at | timestamptz | |

### AI Output Tracking

#### `ai_output_log`
| Field | Type | Notes |
|---|---|---|
| id | uuid PK | |
| org_id | uuid FK → organisations | |
| case_id | uuid FK → cases | |
| function_name | text | |
| model_used | text | |
| raw_output | jsonb | |
| sanitised_output | jsonb | |
| guardrail_violations_found | integer | |
| guardrail_replacements | jsonb | |
| ai_disclaimer | text | |
| human_reviewed | boolean | |
| human_reviewed_by | uuid | |
| human_reviewed_at | timestamptz | |
| report_version | integer | |
| created_by | uuid | |
| created_at | timestamptz | |

### Tier Requirements Matrix

#### `tier_matrix_versions`
| Field | Type | Notes |
|---|---|---|
| id | uuid PK | |
| version_number | integer | |
| status | text | active, draft, archived |
| change_log | text | |
| created_by | uuid | |
| created_at | timestamptz | |

#### `tier_requirements_matrix`
| Field | Type | Notes |
|---|---|---|
| id | uuid PK | |
| matrix_version_id | uuid FK → tier_matrix_versions | |
| report_tier | text | Core, Enhanced, Premium |
| required_source_categories | jsonb | Mandatory source types |
| min_retrieval_logs | jsonb | Min logs per category |
| required_commentary_sections | jsonb | |
| ai_review_required | boolean | |
| adverse_media_threshold | integer | |
| adverse_media_requires_contextual_analysis | boolean | |
| sanctions_match_requires_manager_review | boolean | |
| escalation_risk_band_threshold | text | |
| qa_checklist_items | jsonb | |
| created_at | timestamptz | |

#### `tier_deviation_overrides`
| Field | Type | Notes |
|---|---|---|
| id | uuid PK | |
| case_id | uuid FK → cases | |
| matrix_version_id | uuid FK → tier_matrix_versions | |
| requirement_rule_key | text | |
| requirement_label | text | |
| reason_for_deviation | text | Required |
| supporting_notes | text | |
| officer_id | uuid | |
| status | text | pending, approved, rejected |
| reviewer_id | uuid | |
| reviewer_reason | text | |
| reviewed_at | timestamptz | |
| created_at / updated_at | timestamptz | |

### Research

#### `research_sources`
| Field | Type | Notes |
|---|---|---|
| id | uuid PK | |
| name | text | |
| *source metadata* | | URL, category, coverage |

#### `retrieval_logs`
| Field | Type | Notes |
|---|---|---|
| id | uuid PK | |
| case_id | uuid FK → cases | |
| entity_id | uuid FK → entities | |
| source_id | uuid FK → research_sources | |
| officer_id | uuid | |
| query_text | text | |
| purpose_of_search | text | |
| outcome_status | text | |
| promoted_to | text | |
| notes_internal | text | |
| created_at | timestamptz | |

### Entitlements & Features

#### `entitlement_change_log`
| Field | Type | Notes |
|---|---|---|
| id | uuid PK | |
| org_id | uuid FK → organisations | |
| field_changed | text | |
| old_value / new_value | text | |
| changed_by | uuid | |
| reason | text | Required |
| created_at | timestamptz | |

#### `feature_activation_log`
| Field | Type | Notes |
|---|---|---|
| id | uuid PK | |
| org_id | uuid FK → organisations | |
| feature_key | text | |
| action | text | |
| previous_value / new_value | boolean | |
| changed_by | uuid | |
| created_at | timestamptz | |

#### `upgrade_requests`
| Field | Type | Notes |
|---|---|---|
| id | uuid PK | |
| org_id | uuid FK → organisations | |
| requested_feature | text | |
| requested_by | uuid | |
| notes | text | |
| status | text | pending, approved, rejected |
| resolved_by | uuid | |
| resolution_notes | text | |
| resolved_at | timestamptz | |
| created_at / updated_at | timestamptz | |

### Other Tables

#### `all_stations_notices`
| Field | Type | Notes |
|---|---|---|
| id | uuid PK | |
| case_id | uuid FK → cases | |
| org_id | uuid | |
| subject | text | |
| body | text | |
| sender_user_id | uuid | |
| created_at | timestamptz | |

#### `indicator_cadence_rule`
| Field | Type | Notes |
|---|---|---|
| id | uuid PK | |
| indicator_type | text | |
| expected_max_age_days | integer | Freshness threshold |
| notes | text | |
| created_at | timestamptz | |

#### `market_lessons`
| Field | Type | Notes |
|---|---|---|
| id | uuid PK | |
| title | text | |
| publication_name / publication_url | text | |
| summary_text | text | |
| governance_reflection | text | |
| category | text | |
| jurisdiction_country_code | text | |
| publication_date | date | |
| published | boolean | |
| created_by | uuid | |
| created_at / updated_at | timestamptz | |

#### `review_reminders`
| Field | Type | Notes |
|---|---|---|
| id | uuid PK | |
| entity_id | uuid FK → entities | |
| org_id | uuid FK → organisations | |
| reminder_type | text | |
| recipient_email | text | |
| sent_date | date | |
| sent_at | timestamptz | |

#### `saved_views`
| Field | Type | Notes |
|---|---|---|
| id | uuid PK | |
| org_id | uuid FK → organisations | |
| user_id | uuid | |
| page_type | text | |
| name | text | |
| filter_json | jsonb | |
| created_at | timestamptz | |

#### `methodology_versions`
(Referenced via methodology pages)
- Versioned risk methodology documents
- Audience: CLIENT or INTERNAL

#### `narrative_templates`
(Referenced via AI assistant)
- Templates for AI-generated narrative sections
- Tone and instruction guidance

#### `module_types`
(Referenced via case_modules)
- Defines available investigation modules (Commercial Posture, Jurisdiction Benchmark, etc.)

#### `commercial_posture_inputs`
| Field | Type | Notes |
|---|---|---|
| id | uuid PK | |
| case_module_id | uuid FK → case_modules | |
| reference_type | text | |
| source_category | text | |
| note_text | text | |
| attachment_url | text | |
| confidence | text | |
| is_anonymised | boolean | |
| created_at | timestamptz | |

#### `jurisdiction_benchmark_inputs`
| Field | Type | Notes |
|---|---|---|
| id | uuid PK | |
| case_module_id | uuid FK → case_modules | |
| jurisdiction_country | text | |
| sector | text | |
| indices_used | jsonb | |
| normal_patterns / abnormal_patterns | text | |
| practical_guidance | text | |
| enforcement_reality_notes | text | |
| confidence | text | |
| created_at | timestamptz | |

---

## 4. Feature Modules

### 4.1 Public Website
- **Pages:** Home, About, Services, Sectors, Insights, Observations, Contact
- **Layout:** `WebsiteLayout` (separate from app)
- **Routes:** `/`, `/about`, `/services`, `/sectors`, `/insights`, `/observations`, `/contact`

### 4.2 Authentication
- Email/password sign-up and sign-in
- Auto-profile creation via database trigger
- Role-based redirect (Partner → `/partner/tasks`, others → `/dashboard`)

### 4.3 Dashboard
- Role-adaptive widgets: Active Cases, Approvals Summary, Plan Utilisation, Risk Distribution, Enhancement Coverage, Monitoring Alerts, Jurisdiction Impact, LIA Summary, Programme Health, "What Changed" feed
- Manager Dashboard View with global metrics
- Risk Coverage View

### 4.4 Entity Management
- **Register:** List, Map, Table views with filters
- **Entity Detail:** Tabbed interface (Overview, Profile, Ownership Structure, Review Cycle, Monitoring, Deliverables, Activity, Jurisdiction Links, CR Risk Band, Commercial Posture, Jurisdiction Benchmark, Client Policy Outcome, Master Entity Link, Assurance Enhancements)
- **Bulk Upload:** CSV/XLSX import with validation
- **Entity Map View:** Leaflet-based geolocation with theme toggle
- **Operating Countries:** Confidence-tagged country footprint
- **Ownership Intelligence:** D3 network graph + tree view, provenance layer, risk mismatch detection, jurisdiction overlay, PDF/PNG export

### 4.5 Case Management
- **Commission Page:** Entity selection → product type → priority → DP declaration → submit
- **Case Queue:** Filterable list of all cases (officer sees assigned only)
- **Case Detail:** Tabbed workspace
  - Scope & Mandate / Tier Requirements / Tier Deviations
  - Task Board (Kanban/List with dependencies)
  - Research Console / Retrieval Logs
  - Partner Engagement (create/manage partner tasks)
  - Evidence Locker (private bucket uploads)
  - Chat (dual-thread: internal + client)
  - AI Assurance Panel / Agentic Review
  - Report Builder Engine / PDF Renderer
  - Report Annex Preview / Amendment Panel
  - QA & Release workflow
  - Time Tracker
  - Processing Record / Data Protection Summary
  - Quote Panel
  - Escalation Panel

### 4.6 Approvals
- Multi-trigger approval gates: Tier A entities, rush priority, price thresholds, EDD+ enhancements, high DP risk, Emergency Notes
- Pending count badges in sidebar
- Client Admin approval queue

### 4.7 Deliverables
- Versioned file management
- Expunge (GDPR erasure) with audit log
- Signed URL generation for secure downloads

### 4.8 Monitoring
- Entity monitoring subscriptions
- Alert-driven event review
- Change log tracking

### 4.9 Jurisdiction Intelligence
- **Jurisdiction Library:** Searchable jurisdiction database with indicators
- **Jurisdiction Profile:** Deep-dive per country (indicators, profiles, updates, regime maps)
- **Jurisdiction Brief:** Client-facing summary
- **Alert System:** Subscription-based notifications for FATF, EU HRTC, Sanctions, CPI changes
- **Impact Analysis:** Auto-triggered assessment of which entities/policies are affected by jurisdiction changes

### 4.10 Policy Management
- Organisation risk policies with tier-based rules
- Client Policy Mapping (custom indicator → outcome rules)
- Policy Simulation (what-if analysis against monitored entities)
- Auto-approval settings

### 4.11 Reporting
- Structured Report Builder (data + commentary + AI draft + QA)
- Assurance Note Report component
- Report versioning with immutable issuance
- SHA-256 integrity hashing
- PDF rendering
- Report Annex generation (jurisdiction indicator audit trail)

### 4.12 AI Features
- **AI Assurance Assistant:** Gemini-powered narrative generation for executive summaries
- **Agentic Review:** Automated case review suggestions
- **Guardrail System:** Violation detection and sanitisation
- **Human-in-the-loop:** All AI outputs require manual acceptance/rejection
- **Automation Coverage Map:** Tracks AI vs human decisions

### 4.13 Partner Portal
- Isolated layout (`PartnerLayout`)
- Task list and detail views
- Structured question responses
- Evidence upload to `partner-evidence` bucket
- Geolocation tagging on items

### 4.14 Workload Management
- Calendar Swimlane view
- Gantt View
- Officer Capacity Panel
- Workload Filters

### 4.15 Commercial Operations
- Product Catalogue management
- Quote creation with line items, discounts, VAT
- Work Order generation on quote approval
- Unit Economics dashboard
- Commercial Dashboard
- Client Spend Summary
- Budget Controls with caps and overrides
- Billing Handoff
- Reconciliation

### 4.16 Research Console
- Source Registry management
- Structured retrieval logging
- Search query tracking with outcome status

### 4.17 Administration (Platform Admin)
- Data Source management
- Ingestion Run monitoring with error detail
- Sanctions Regime Map curation
- Methodology version management
- Feature Controls (per-org feature flags)
- Entitlement Settings
- Market Lessons administration

### 4.18 Client Onboarding
- Guided onboarding wizard for new clients

### 4.19 Knowledge Base
- Internal knowledge repository for officers

---

## 5. User Workflows (Step-by-Step)

### 5.1 Client: Entity Registration → Case Commission

```
1. Client Admin/Requester logs in → /dashboard
2. Navigate to /entities → Click "Add Entity"
3. Fill entity form: name, type, registration, addresses, country codes
4. Entity created with org_id scoping
5. Navigate to /commission
6. Select existing entity from dropdown
7. Choose product type (Assurance Note / Dossier / Emergency Note)
8. Set priority (Standard / Rush)
9. Complete DP Declaration step:
   a. Confirm data minimisation
   b. Select applicable Master LIA template
   c. Flag special category / criminal data if applicable
10. Submit commission → Case created with status "submitted"
11. If approval required (policy rule, rush, price, EDD+, high DP):
    → Case enters approval queue
    → Client Admin reviews at /approvals
    → Approve or reject
12. If auto-approved or manually approved → Case status → "quoted" (awaiting CR quote)
```

### 5.2 CR Manager: Quote → Assign → Oversee

```
1. Manager logs in → /cases (All Cases queue)
2. Open submitted/approved case
3. Navigate to Quote Panel
4. Create quote with line items from Product Catalogue
5. Set SLA, due date, discount, VAT
6. Send quote to client → Case status → "quoted"
7. Client approves quote (at /approvals)
8. Work Order auto-generated
9. Manager assigns officer (assigned_to field)
10. Manager assigns QA reviewer (qa_owner field)
11. Case status → "in_progress"
12. Manager monitors progress via:
    - /workload (capacity view)
    - /cases (queue filters)
    - Case detail → Task Board
    - /qa-queue (submitted for QA)
13. After QA pass → Manager issues report → status → "delivered"
14. Manager closes case → status → "closed"
```

### 5.3 CR Officer: Execute Investigation

```
1. Officer logs in → /cases (My Cases, filtered to assigned)
2. Open assigned case
3. Review Scope & Mandate, Tier Requirements
4. Work Task Board:
   a. Create/update tasks (research, writing, review)
   b. Log time entries per bucket
5. Use Research Console:
   a. Search sources → create retrieval logs
   b. Link retrieval logs to tasks
6. Upload evidence to Evidence Locker
7. Create Partner Tasks if needed:
   a. Select partner from directory
   b. Define questions and method statement
   c. Set deadline → Partner notified
   d. Review partner responses when complete
8. Use AI Assurance Assistant:
   a. Generate narrative drafts
   b. Accept/edit/reject AI outputs
   c. All decisions logged to ai_output_log
9. Build report via Report Builder:
   a. Complete required sections per Tier Matrix
   b. Lock structured data
   c. Add officer commentary
10. Submit to QA → Case status → "qa_review"
11. If deviations from Tier Matrix:
    a. Request deviation override with justification
    b. Manager approves/rejects
12. Await QA feedback or approval
```

### 5.4 Partner: Complete Task

```
1. Partner logs in → /partner/tasks
2. View assigned tasks with deadlines
3. Open task detail
4. Complete structured questions
5. Upload evidence files to partner-evidence bucket
6. Add geolocation data to items if applicable
7. Mark items as completed
8. Add response notes
9. Submit task → status updated
10. CR Officer reviews responses in case detail
```

### 5.5 Jurisdiction Indicator Update (Automated)

```
1. Scheduled ingestion function runs (e.g., fatf-ingest)
2. Fetches latest data from source URL
3. Canonicalises country names via jurisdiction_alias
4. Compares against existing jurisdiction_indicator records
5. If change detected:
   a. Creates jurisdiction_indicator_change record
   b. Trigger fn_create_alert_event fires
   c. alert_event created
   d. alert_notification fan-out to subscribed users and monitored-entity owners
   e. Trigger fn_trigger_impact_analysis fires
   f. Edge function jurisdiction-impact-analysis evaluates affected entities
   g. jurisdiction_change_impact records created
6. Users see alerts at /client/alerts with unread badge
```

### 5.6 Client Policy Simulation

```
1. Client Admin navigates to /client/policy
2. Creates or edits a policy ruleset with rules
3. Navigates to /client/policy/simulate
4. Creates simulation with proposed rules
5. System evaluates proposed rules against all monitored entities
6. Results show before/after comparison per entity
7. If satisfied, promote simulation to new production ruleset version
```

---

## 6. Risk Scoring & Calculation Logic

### 6.1 CR Jurisdiction Risk Engine (CR-JURIS-1.0)

**Location:** `supabase/functions/cr-risk-engine/index.ts`

**Input:** `entity_id`

**Process:**
1. Load active engine config from `cr_risk_engine_config` (weights + thresholds)
2. Resolve entity's jurisdiction links:
   - Primary: `entity_jurisdiction_link` table (with link_type weights)
   - Fallback: Legacy `entities.incorporation_country_code`, `hq_country_code`, `entity_operating_countries`
3. Load all `jurisdiction_indicator` records for linked jurisdictions
4. Score each indicator with weight multipliers:

| Indicator | Condition | Base Points | Min Band |
|---|---|---|---|
| FATF_STATUS | CALL_FOR_ACTION / Black List | 50 | HIGH |
| FATF_STATUS | INCREASED_MONITORING / Grey List | 25 | — |
| EU_AML_HRTC | YES / LISTED / High-Risk Third Country | 25 | — |
| SANCTIONS_* | COMPREHENSIVE | 40 | — |
| SANCTIONS_* | TARGETED (or any) | 20 | — |
| CPI_SCORE | Score < 30 | 10 | — (never sole trigger) |

5. Apply link_type weight multipliers:

| Link Type | Weight |
|---|---|
| INCORPORATION | 1.0 |
| OPERATIONS | 1.0 |
| UBO_NATIONALITY | 0.7 |
| BANK_LOCATION | 0.7 |
| SUPPLIER_LOCATION | 0.7 |
| SHIPPING_ROUTE | 0.7 |
| OTHER | 0.5 |

6. Cap score at 100
7. Determine band from configurable thresholds
8. Enforce minimum band (FATF Call for Action → min HIGH)
9. Map band to recommended controls:

| Band | Controls |
|---|---|
| LOW | Standard DD |
| MEDIUM | Standard DD + Annual review |
| HIGH | EDD + SOW/SOF verification + Senior approval + 6-month review |
| SEVERE | EDD + SOW/SOF + Board/MLRO approval + Enhanced monitoring + Legal review + Quarterly review |

10. Store result in `cr_risk_result`

**Output:** `{ risk_score, risk_band, contributing_factors_json, recommended_controls_json }`

### 6.2 Pillar-Based Risk Model (Entity-Level)

**Stored in:** `entity_risk_scores` + `risk_model_configs`

**Four Pillars:**
1. **Jurisdiction** (0–100): Based on CR-JURIS engine output
2. **Structural** (0–100): Corporate structure complexity, opacity
3. **Association** (0–100): Related party risk signals
4. **Event** (0–100): Adverse media, enforcement actions

**Calculation:**
```
overall_score = (jurisdiction_score × jurisdiction_weight)
              + (structural_score × structural_weight)
              + (association_score × association_weight)
              + (event_score × event_weight)
```

**Band Determination:**
- 0 → band_low_max: Low
- band_low_max+1 → band_medium_max: Medium
- band_medium_max+1 → band_high_max: High
- band_high_max+1 → 100: Critical

**Manual Override:** Managers can override bands via `risk_overrides` with mandatory justification.

### 6.3 Approval Logic

**Location:** `src/lib/approval-utils.ts`

Approval is required if ANY of these conditions are true:
1. `policy_rules.approval_required = true` for the entity's risk tier
2. Priority is "rush"
3. Product type is "Emergency Note"
4. EDD+ enhancements are selected
5. Price exceeds `organisations.approval_price_threshold`
6. DP risk level is "high"

### 6.4 Client Policy Evaluation

**Location:** `supabase/functions/evaluate-client-policy/index.ts`

Evaluates `client_policy_rule` records against an entity's jurisdiction indicators using configurable operators (EQUALS, IN, GTE, LTE, EXISTS, etc.) to produce outcome actions (e.g., EDD_REQUIRED, ENHANCED_MONITORING).

---

## 7. Edge Functions (Backend Logic)

| Function | Purpose |
|---|---|
| `cr-risk-engine` | Jurisdiction risk scoring engine (CR-JURIS-1.0) |
| `agentic-review` | AI-powered automated case review |
| `ai-assurance-assistant` | Gemini-based narrative generation |
| `cadence-scheduler` | Automated review cadence scheduling |
| `cpi-ingest` | Corruption Perceptions Index data ingestion |
| `eu-fsf-ingest` | EU Financial Sanctions Facility ingestion |
| `evaluate-client-policy` | Client policy rule evaluation engine |
| `export-audit` | Secure audit export with RBAC enforcement |
| `fatf-ingest` | FATF grey/black list data ingestion |
| `fetch-governance-rss` | Governance RSS feed aggregation |
| `generate-governance-summary` | AI summary of governance updates |
| `generate-narrative` | AI narrative generation for reports |
| `geocode` | Address geocoding service |
| `ingestion-runner` | Generic ingestion orchestrator |
| `jurisdiction-impact-analysis` | Entity impact assessment on jurisdiction changes |
| `notify-quote-approved` | Notification on quote approval |
| `notify-quote-ready` | Notification when quote is ready |
| `ofac-ingest` | OFAC sanctions list ingestion |
| `report-annex-generator` | Structured report annex generation |
| `review-reminders` | Automated review reminder emails |
| `run-policy-simulation` | Policy simulation batch processor |
| `signed-url` | Secure signed URL generation for file downloads |
| `uk-sanctions-ingest` | UK Sanctions List (UKSL) ingestion |

---

## 8. Third-Party Integrations

| Integration | Purpose | Implementation |
|---|---|---|
| **Supabase Auth** | Authentication (email/password) | Built-in via Lovable Cloud |
| **Supabase Storage** | File storage (3 private buckets) | Built-in via Lovable Cloud |
| **Supabase Realtime** | Live alert notifications | Built-in via Lovable Cloud |
| **Leaflet** | Interactive maps for entity geolocation | `react-leaflet` package |
| **D3.js** | Ownership network graph visualisation | `d3` package |
| **Recharts** | Dashboard charts and analytics | `recharts` package |
| **Resend** | Email delivery (review reminders, notifications) | Edge function via `RESEND_API_KEY` secret |
| **Lovable AI** | AI narrative generation, governance summaries | Via `LOVABLE_API_KEY` (Gemini models) |
| **SheetJS (xlsx)** | CSV/XLSX parsing for bulk entity upload | `xlsx` package |
| **FATF** | Grey/Black list data source | Ingestion edge function |
| **OFAC** | US sanctions list data source | Ingestion edge function |
| **EU FSF** | EU financial sanctions data source | Ingestion edge function |
| **UK Sanctions List** | UK sanctions data source | Ingestion edge function |
| **Transparency International** | CPI score data source | Ingestion edge function |

---

## 9. Database Functions & Triggers

### Functions

| Function | Type | Purpose |
|---|---|---|
| `has_role(_user_id, _role)` | SECURITY DEFINER | Check if user has specific role (RLS-safe) |
| `get_user_org_id(_user_id)` | SECURITY DEFINER | Get user's org_id (RLS-safe) |
| `is_internal(_user_id)` | SECURITY DEFINER | Check if user has any internal role |
| `can_qc_signoff(_user_id)` | SECURITY DEFINER | Check QC sign-off permission |
| `handle_new_user()` | TRIGGER | Auto-create profile on auth.users insert |
| `fn_create_alert_event()` | TRIGGER | Create alert events + fan-out notifications on indicator changes |
| `fn_trigger_impact_analysis()` | TRIGGER | HTTP call to impact analysis edge function on new alert events |
| `map_indicator_to_alert_type(ind_type)` | IMMUTABLE | Map indicator type to client alert type enum |

### Trigger Wiring
- `handle_new_user` → fires on `auth.users` INSERT
- `fn_create_alert_event` → fires on `jurisdiction_indicator_change` INSERT
- `fn_trigger_impact_analysis` → fires on `alert_event` INSERT (via `pg_net` HTTP extension)

---

## 10. Enumerations & Constants

| Enum | Values |
|---|---|
| `app_role` | client_admin, client_requester, client_auditor, fvc_analyst, fvc_ops_admin, partner, fvc_assurance_manager, fvc_assurance_officer, fvc_assurance_lead, fvc_quality_reviewer |
| `client_alert_type` | FATF_CHANGE, EU_HRTC_CHANGE, UK_SANCTIONS_CHANGE, EU_SANCTIONS_CHANGE, OFAC_SANCTIONS_CHANGE, CPI_CHANGE |
| `cr_risk_band` | LOW, MEDIUM, HIGH, SEVERE |
| `impact_type` | POLICY_TRIGGER, CR_SCORE_CHANGE, MONITORING_ALERT |
| `indicator_type` | FATF_STATUS, EU_AML_HRTC, SANCTIONS_UK_PROGRAMME, SANCTIONS_EU_PROGRAMME, SANCTIONS_US_OFAC_PROGRAMME, US_STATE_SPONSOR_TERRORISM, US_FINCEN_311, EU_TAX_NONCOOP, CPI_SCORE |
| `jurisdiction_link_type` | INCORPORATION, OPERATIONS, UBO_NATIONALITY, BANK_LOCATION, SUPPLIER_LOCATION, SHIPPING_ROUTE, OTHER |
| `link_confidence` | CONFIRMED, LIKELY, UNCONFIRMED |
| `methodology_audience` | CLIENT, INTERNAL |
| `policy_operator` | EQUALS, NOT_EQUALS, IN, NOT_IN, GTE, LTE, GT, LT, EXISTS, NOT_EXISTS |
| `report_approval_status` | pending, approved, rejected |
| `report_section_key` | EXEC_SUMMARY, JURISDICTION_ANNEX, METHODOLOGY_NOTE |
| `report_status` | DRAFT, ISSUED |
| `report_workflow_status` | draft, in_review, approved, issued |
| `sanctions_authority` | UK, EU, US |
| `sanctions_regime_type` | TARGETED, COMPREHENSIVE |
| `sanctions_source` | UKSL, OFAC, EU_FSF |

### Feature Tier Constants (src/lib/feature-tiers.ts)

| Plan | Label | Features Included |
|---|---|---|
| A | Premium | All features |
| B | Standard | Advanced Risk Alerts, Export PDF Advanced + all C features |
| C | Essential | Base features only |
| custom | Bespoke | Individually configured |

### Feature Flags (src/hooks/use-feature-flags.ts)
- `ownership_structure_intelligence` (Plan A)
- `monitoring_module` (Plan A)
- `jurisdiction_benchmark` (Plan A)
- `advanced_risk_alerts` (Plan B)
- `provenance_view` (Plan A)
- `export_pdf_advanced` (Plan B)

---

## 11. Storage Buckets

| Bucket | Public | Purpose |
|---|---|---|
| `deliverables` | No | Final report files and deliverable documents |
| `partner-evidence` | No | Partner-uploaded evidence and files |
| `case-evidence` | No | Internal case evidence uploads |

All access via signed URLs generated by the `signed-url` edge function with RBAC enforcement.

---

## 12. Complete File & Component List

### Pages (src/pages/)

| File | Route | Purpose |
|---|---|---|
| `Index.tsx` | — | Root redirect |
| `AuthPage.tsx` | `/auth` | Login/signup |
| `DashboardPage.tsx` | `/dashboard` | Main dashboard |
| `EntitiesPage.tsx` | `/entities` | Entity register |
| `EntityDetailPage.tsx` | `/entities/:id` | Entity detail |
| `CommissionPage.tsx` | `/commission` | Case commissioning |
| `ApprovalsPage.tsx` | `/approvals` | Approval queue |
| `DeliverablesPage.tsx` | `/deliverables` | Deliverable management |
| `MonitoringPage.tsx` | `/monitoring` | Entity monitoring |
| `PoliciesPage.tsx` | `/policies` | Policy management |
| `AuditLogPage.tsx` | `/audit-log` | Audit trail |
| `CaseQueuePage.tsx` | `/cases` | Case queue |
| `CaseDetailPage.tsx` | `/cases/:id` | Case workspace |
| `ModuleWorkbenchPage.tsx` | `/cases/:caseId/modules/:moduleId` | Module workbench |
| `WorkloadPage.tsx` | `/workload` | Workload management |
| `MasterEntitiesPage.tsx` | `/master-entities` | Master entity registry |
| `MasterEntityDetailPage.tsx` | `/master-entities/:id` | Master entity detail |
| `ProgrammeSettingsPage.tsx` | `/programme-settings` | Programme configuration |
| `PartnerDirectoryPage.tsx` | `/partner-directory` | Partner directory |
| `ReconciliationPage.tsx` | `/reconciliation` | Reconciliation tasks |
| `RiskModelPage.tsx` | `/risk-model` | Risk model config |
| `QaQueuePage.tsx` | `/qa-queue` | QA review queue |
| `MyTasksPage.tsx` | `/my-tasks` | Officer tasks |
| `PartnerRequestsPage.tsx` | `/partner-requests` | Partner requests |
| `KnowledgeBasePage.tsx` | `/knowledge-base` | Knowledge repository |
| `SourceRegistryPage.tsx` | `/source-registry` | Source registry |
| `ResearchConsolePage.tsx` | `/research-console` | Research tools |
| `JurisdictionLibraryPage.tsx` | `/jurisdiction-library` | Jurisdiction library |
| `JurisdictionsListPage.tsx` | `/jurisdictions` | Jurisdiction list |
| `JurisdictionProfilePage.tsx` | `/jurisdictions/:id` | Jurisdiction profile |
| `JurisdictionBriefPage.tsx` | `/jurisdictions/:id/brief` | Jurisdiction brief |
| `UnitEconomicsPage.tsx` | `/unit-economics` | Unit economics |
| `TierMatrixPage.tsx` | `/tier-matrix` | Tier requirements |
| `ProductCataloguePage.tsx` | `/product-catalogue` | Product catalogue |
| `BudgetControlsPage.tsx` | `/budget-controls` | Budget management |
| `BillingHandoffPage.tsx` | `/billing-handoff` | Billing handoff |
| `WorkOrdersPage.tsx` | `/work-orders` | Work orders |
| `EntitlementSettingsPage.tsx` | `/entitlement-settings` | Entitlements |
| `ServiceRequestPage.tsx` | `/service-request` | Service requests |
| `CommercialDashboardPage.tsx` | `/commercial-dashboard` | Commercial analytics |
| `ClientSpendSummaryPage.tsx` | `/spend-summary` | Spend summary |
| `IngestionSourcesPage.tsx` | `/ingestion-sources` | Ingestion sources |
| `ClientAlertsPage.tsx` | `/client/alerts` | Client alerts |
| `ClientPolicyPage.tsx` | `/client/policy` | Client policy |
| `PolicySimulatePage.tsx` | `/client/policy/simulate` | Policy simulation |
| `ClientOnboardingPage.tsx` | `/client/onboarding` | Onboarding wizard |
| `LiaLibraryPage.tsx` | `/lia-library` | LIA templates |
| `MethodologyPage.tsx` | `/methodology` | Risk methodology |
| `AutoApprovalSettingsPage.tsx` | `/approval-settings` | Auto-approval rules |
| `OrgSettingsPage.tsx` | `/org-settings` | Organisation settings |
| `FeatureControlsPage.tsx` | `/feature-controls` | Feature flags |
| `UpgradeRequestsPage.tsx` | `/upgrade-requests` | Upgrade requests |
| `MarketLessonsAdminPage.tsx` | `/admin/market-lessons` | Market lessons |
| `SupportPage.tsx` | `/support` | Support |
| `StubPage.tsx` | Various | Placeholder pages |
| `NotFound.tsx` | `*` | 404 page |

#### Admin Pages (src/pages/admin/)
| File | Route |
|---|---|
| `AdminSourcesPage.tsx` | `/admin/sources` |
| `AdminIngestionRunsPage.tsx` | `/admin/ingestion-runs` |
| `AdminIngestionRunDetailPage.tsx` | `/admin/ingestion-runs/:id` |
| `SanctionsRegimesPage.tsx` | `/admin/sanctions-regimes` |
| `MethodologyAdminPage.tsx` | `/admin/methodology` |

#### Partner Pages (src/pages/partner/)
| File | Route |
|---|---|
| `PartnerTaskListPage.tsx` | `/partner/tasks` |
| `PartnerTaskDetailPage.tsx` | `/partner/tasks/:taskId` |

#### Website Pages (src/pages/website/)
| File | Route |
|---|---|
| `HomePage.tsx` | `/` |
| `AboutPage.tsx` | `/about` |
| `ServicesPage.tsx` | `/services` |
| `SectorsPage.tsx` | `/sectors` |
| `InsightsPage.tsx` | `/insights` |
| `ObservationsPage.tsx` | `/observations` |
| `ContactPage.tsx` | `/contact` |

### Components (src/components/)

#### Layout
- `AppLayout.tsx` — Main app layout with sidebar
- `AppSidebar.tsx` — Role-adaptive sidebar navigation
- `PartnerLayout.tsx` — Isolated partner portal layout
- `ProtectedRoute.tsx` — Auth guard
- `InternalRouteGuard.tsx` — Internal role guard
- `NavLink.tsx` — Navigation link component

#### Case Detail (src/components/case-detail/)
- `AgenticReviewPanel.tsx` — AI agentic review
- `AiAssurancePanel.tsx` — AI assistant interface
- `AutomationCoverageMap.tsx` — AI vs human decision tracking
- `CaseChatPanel.tsx` — Dual-thread messaging
- `CaseProcessingRecord.tsx` — DP processing record
- `CaseRetrievalLogs.tsx` — Research retrieval logs
- `CaseTaskBoard.tsx` — Kanban/List task board
- `CaseTimeTracker.tsx` — Time entry management
- `DataProtectionSummary.tsx` — DP summary
- `EvidenceLocker.tsx` — File upload/management
- `ExecNarrativePanel.tsx` — Executive summary panel
- `PartnerEscalationPanel.tsx` — Partner escalation
- `PreQaReviewPanel.tsx` — Pre-QA checklist
- `QuotePanel.tsx` — Quoting interface
- `ReportAmendmentPanel.tsx` — Report amendments
- `ReportAnnexPreview.tsx` — Annex preview
- `ReportAssuranceWorkflow.tsx` — Report workflow
- `ReportBuilderEngine.tsx` — Structured report builder
- `ReportPdfRenderer.tsx` — PDF generation
- `TierDeviationPanel.tsx` — Tier deviation overrides
- `TierRequirementsPanel.tsx` — Tier requirements display

#### Entity Detail (src/components/entity-detail/)
- `AssuranceEnhancementsPanel.tsx`
- `ClientPolicyOutcomePanel.tsx`
- `CommercialPostureTab.tsx`
- `CrRiskBandPanel.tsx`
- `DeliverablesTab.tsx`
- `EntityDetailHeader.tsx`
- `EntityJurisdictionLinksPanel.tsx`
- `EntityLocationSection.tsx`
- `JurisdictionBenchmarkTab.tsx`
- `MasterEntityLinkPanel.tsx`
- `MonitoringTab.tsx`
- `OverviewTab.tsx`
- `OwnershipNetworkGraph.tsx` — D3 network visualisation
- `OwnershipStructureTab.tsx`
- `OwnershipTreeView.tsx` — Vertical tree layout
- `ProfileTab.tsx`
- `ReviewCycleTab.tsx`
- `ActivityTab.tsx`

#### Dashboard (src/components/dashboard/)
- `ActionsDrawer.tsx` / `ActionsRequired.tsx`
- `ActiveCasesCard.tsx`
- `ApprovalsSummaryCard.tsx`
- `EnhancementCoverageCard.tsx`
- `JurisdictionImpactCard.tsx`
- `LiaSummaryCard.tsx`
- `ManagerDashboardView.tsx`
- `MonitoringAlertsCard.tsx`
- `PlanUtilisationCard.tsx`
- `ProgrammeHealthIndicator.tsx`
- `RiskCoverageView.tsx`
- `RiskDistributionChart.tsx`
- `SavedViewsDropdown.tsx`
- `WhatChangedCard.tsx`

#### Commission (src/components/commission/)
- `DataProtectionStep.tsx`
- `DpDeclarationStep.tsx`

#### Workbench (src/components/workbench/)
- `CommercialPostureWorkbench.tsx`
- `JurisdictionBenchmarkWorkbench.tsx`
- `PartnerTaskDialog.tsx`

#### Workload (src/components/workload/)
- `CalendarSwimlane.tsx`
- `GanttView.tsx`
- `OfficerCapacityPanel.tsx`
- `WorkloadFilters.tsx`

#### LIA (src/components/lia/)
- `LiaExportView.tsx`
- `LiaFormTypes.ts`
- `MiniLiaForm.tsx`

#### Monitoring (src/components/monitoring/)
- `EventReviewButton.tsx`

#### Policy (src/components/policy/)
- `PolicyRuleEditor.tsx`

#### Admin (src/components/admin/)
- `BillingUsagePanel.tsx`
- `FeatureControlsPanel.tsx`

#### Website (src/components/website/)
- `WebsiteLayout.tsx`

#### Shared Components
- `AssuranceNoteReport.tsx`
- `BulkEntityUpload.tsx`
- `CaseActivityTimeline.tsx`
- `CountryCard.tsx`
- `CountryFlagBadge.tsx`
- `CpiUploadPanel.tsx`
- `EnhancementSuggestionPanel.tsx`
- `EntityMapView.tsx`
- `EntityWorldMap.tsx`
- `FreshnessBadge.tsx`
- `JurisdictionAlertsPanel.tsx`
- `JurisdictionRiskTooltip.tsx`
- `JurisdictionSubscribeToggle.tsx`
- `OperatingCountries.tsx`
- `ReviewTimeline.tsx`
- `SavedViewsDropdown.tsx`
- `SourceViewer.tsx`
- `UniversalAuditTimeline.tsx`

#### UI Components (src/components/ui/) — 45 shadcn components
accordion, alert, alert-dialog, aspect-ratio, avatar, badge, breadcrumb, button, calendar, card, carousel, chart, checkbox, collapsible, command, context-menu, dialog, drawer, dropdown-menu, form, hover-card, input, input-otp, label, menubar, navigation-menu, pagination, popover, progress, radio-group, resizable, scroll-area, select, separator, sheet, sidebar, skeleton, slider, sonner, switch, table, tabs, textarea, toast, toaster, toggle, toggle-group, tooltip

### Hooks (src/hooks/)
- `use-alert-notifications.ts` — Real-time alert tracking
- `use-entitlements.ts` — Package entitlement checks
- `use-feature-flags.ts` — Org feature flag loading
- `use-map-theme.tsx` — Map theme toggle
- `use-mobile.tsx` — Mobile detection
- `use-report-version.ts` — Report versioning
- `use-scroll-reveal.ts` — Scroll animation
- `use-theme.ts` — Dark/light theme
- `use-toast.ts` — Toast notifications

### Contexts (src/contexts/)
- `AuthContext.tsx` — Auth state, roles, permissions
- `ViewModeContext.tsx` — Client/Internal view toggle

### Libraries (src/lib/)
- `approval-utils.ts` — Approval requirement logic
- `auto-approval.ts` — Auto-approval engine
- `canonicalise.ts` — Country name → ISO canonicalisation
- `case-statuses.ts` — Case status constants
- `country-flag.ts` — Country flag emoji helper
- `entity-matching.ts` — Fuzzy entity deduplication
- `feature-tiers.ts` — Plan/tier definitions
- `freshness-utils.ts` — Indicator freshness calculation
- `fvc-roles.ts` — Role permission helpers
- `jurisdiction-utils.ts` — Jurisdiction helper functions
- `partner-statuses.ts` — Partner status constants
- `signed-urls.ts` — Signed URL client helper
- `utils.ts` — General utilities (cn, etc.)

### Edge Functions (supabase/functions/)
21 edge functions as listed in Section 7.

### Documentation (docs/)
- `FLOW_CONFIRMATION_PACK.md` — Implementation validation
- `PLATFORM_STATE_AND_ROADMAP.md` — Architecture and roadmap
- `USER_JOURNEY_MAP.md` — Persona-specific workflow documentation

---

## 13. Routing Map

### Public Routes (no auth)
| Path | Component |
|---|---|
| `/` | HomePage |
| `/about` | AboutPage |
| `/services` | ServicesPage |
| `/sectors` | SectorsPage |
| `/insights` | InsightsPage |
| `/observations` | ObservationsPage |
| `/contact` | ContactPage |
| `/auth` | AuthPage |

### Protected Routes (requires auth)
| Path | Guard | Component |
|---|---|---|
| `/dashboard` | Auth | DashboardPage |
| `/entities` | Auth | EntitiesPage |
| `/entities/:id` | Auth | EntityDetailPage |
| `/commission` | Auth | CommissionPage |
| `/service-request` | Auth | ServiceRequestPage |
| `/approvals` | Auth | ApprovalsPage |
| `/deliverables` | Auth | DeliverablesPage |
| `/monitoring` | Auth | MonitoringPage |
| `/policies` | Auth | PoliciesPage |
| `/audit-log` | Auth | AuditLogPage |
| `/cases` | Auth | CaseQueuePage |
| `/cases/:id` | Auth | CaseDetailPage |
| `/cases/:caseId/modules/:moduleId` | Auth | ModuleWorkbenchPage |
| `/client/alerts` | Auth | ClientAlertsPage |
| `/client/policy` | Auth | ClientPolicyPage |
| `/client/policy/simulate` | Auth | PolicySimulatePage |
| `/client/onboarding` | Auth | ClientOnboardingPage |
| `/lia-library` | Auth | LiaLibraryPage |
| `/methodology` | Auth | MethodologyPage |
| `/approval-settings` | Auth | AutoApprovalSettingsPage |
| `/org-settings` | Auth | OrgSettingsPage |
| `/budget-controls` | Auth | BudgetControlsPage |
| `/work-orders` | Auth | WorkOrdersPage |
| `/spend-summary` | Auth | ClientSpendSummaryPage |
| `/support` | Auth | SupportPage |

### Internal Routes (requires fvc_* role)
| Path | Guard | Component |
|---|---|---|
| `/qa-queue` | Internal | QaQueuePage |
| `/my-tasks` | Internal | MyTasksPage |
| `/partner-requests` | Internal | PartnerRequestsPage |
| `/knowledge-base` | Internal | KnowledgeBasePage |
| `/research-console` | Internal | ResearchConsolePage |
| `/jurisdiction-library` | Internal | JurisdictionLibraryPage |
| `/jurisdictions` | Internal | JurisdictionsListPage |
| `/jurisdictions/:id` | Internal | JurisdictionProfilePage |
| `/product-catalogue` | Internal | ProductCataloguePage |

### Manager-Only Routes
| Path | Guard | Component |
|---|---|---|
| `/workload` | Manager | WorkloadPage |
| `/master-entities` | Manager | MasterEntitiesPage |
| `/master-entities/:id` | Manager | MasterEntityDetailPage |
| `/programme-settings` | Manager | ProgrammeSettingsPage |
| `/partner-directory` | Manager | PartnerDirectoryPage |
| `/reconciliation` | Manager | ReconciliationPage |
| `/risk-model` | Manager | RiskModelPage |
| `/feature-controls` | Manager | FeatureControlsPage |
| `/upgrade-requests` | Manager | UpgradeRequestsPage |
| `/admin/market-lessons` | Manager | MarketLessonsAdminPage |
| `/admin/sources` | Manager | AdminSourcesPage |
| `/admin/ingestion-runs` | Manager | AdminIngestionRunsPage |
| `/admin/ingestion-runs/:id` | Manager | AdminIngestionRunDetailPage |
| `/admin/sanctions-regimes` | Manager | SanctionsRegimesPage |
| `/admin/methodology` | Manager | MethodologyAdminPage |
| `/unit-economics` | Manager | UnitEconomicsPage |
| `/tier-matrix` | Manager | TierMatrixPage |
| `/billing-handoff` | Manager | BillingHandoffPage |
| `/entitlement-settings` | Manager | EntitlementSettingsPage |
| `/commercial-dashboard` | Manager | CommercialDashboardPage |
| `/source-registry` | Manager | SourceRegistryPage |
| `/ingestion-sources` | Manager | IngestionSourcesPage |

### Partner Routes (isolated layout)
| Path | Component |
|---|---|
| `/partner/tasks` | PartnerTaskListPage |
| `/partner/tasks/:taskId` | PartnerTaskDetailPage |

---

## 14. Feature Flags & Entitlements

### Organisation Feature Tiers (Plans)
Plans control which platform modules are available to an organisation:

| Feature | Premium (A) | Standard (B) | Essential (C) |
|---|---|---|---|
| Ownership & Structure Intelligence | ✅ | ❌ | ❌ |
| Monitoring Module | ✅ | ❌ | ❌ |
| Jurisdiction Benchmark | ✅ | ❌ | ❌ |
| Provenance View | ✅ | ❌ | ❌ |
| Advanced Risk Alerts | ✅ | ✅ | ❌ |
| Export to PDF (Advanced) | ✅ | ✅ | ❌ |

**Important:** "Plan" (feature tier) and "Risk Tier" (entity risk classification) are independent concepts.

### Feature Flag Loading
- Flags stored in `org_feature_flags` table (org_id, feature_key, enabled)
- Loaded via `useFeatureFlags()` hook
- Defaults to `false` for all features if no org flags exist
- Managers can override per-org via Feature Controls page

### Entitlement Change Tracking
All plan/entitlement changes logged to `entitlement_change_log` with mandatory reason field.

### Upgrade Request Flow
1. Client sees locked feature
2. Submits upgrade request
3. Internal manager reviews at `/upgrade-requests`
4. Approves → Feature flags updated
5. Or rejects with resolution notes

---

*End of Technical Specification*
