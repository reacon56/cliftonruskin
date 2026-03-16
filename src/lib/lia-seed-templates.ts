/**
 * Three pre-built Master LIA templates updated for the
 * Data (Use and Access) Act 2025 (in force 5 February 2026).
 */

export interface SeedTemplate {
  name: string;
  purpose_category: string;
  lawful_basis: string;
  legitimate_interest: string;
  necessity: string;
  less_intrusive: string;
  balancing_fields: Record<string, any>;
  safeguards: string;
  retention_months: number;
  outcome: string;
  conditions: string;
  scope_summary: string;
  effective_date: string;
  approved_by_name: string;
  status: "final";
  version_number: number;
}

export const SEED_TEMPLATES: SeedTemplate[] = [
  // ─── TEMPLATE 1: Standard Third-Party Due Diligence ───────────────
  {
    name: "Standard Third-Party Due Diligence",
    purpose_category: "Third-party due diligence",
    lawful_basis: "legitimate_interests",
    legitimate_interest:
      `The organisation has a legitimate interest in identifying financial crime risk, verifying the integrity of its third-party relationships, and protecting itself from regulatory, reputational and commercial harm arising from association with sanctioned, corrupt or fraudulent entities. This processing also serves the broader public interest in the prevention and detection of financial crime.

Lawful Basis Detail:
Primary: Article 6(1)(f) UK GDPR — Legitimate Interests.
Alternative (where DD is directed at financial crime prevention): Article 6(1)(ea) UK GDPR — Recognised Legitimate Interest (crime prevention and detection), as introduced by the Data (Use and Access) Act 2025. Where the Recognised Legitimate Interest basis applies, the balancing test below is not legally required but is documented as best practice.`,
    necessity:
      `The processing is necessary to fulfil the organisation's third-party risk management obligations. Entity-level checks alone are insufficient to identify financial crime risk where individual officers or UBOs may be sanctioned or implicated in adverse activity. No less privacy-intrusive means can achieve the same outcome.`,
    less_intrusive:
      `Entity-level checks alone are insufficient to identify financial crime risk where individual officers or UBOs may be sanctioned or implicated in adverse activity. No less privacy-intrusive means can achieve the same outcome.`,
    balancing_fields: {
      reasonable_expectations: "low",
      likely_impact: "low",
      nature_of_processing: "limited",
      mitigations: ["minimisation", "role_based_access", "encryption", "retention_limit", "redaction"],
      notes:
        `The impact on data subjects is proportionate. Subjects are corporate officers and business owners who have a reduced expectation of privacy in their professional capacity. Processing is limited to professional and business information. Data subjects' interests do not override the legitimate interest given the regulatory environment and commercial risk managed.

Automated Processing Note: Where AI-assisted tools are used in the screening or assessment process, processing complies with DUAA 2025 amendments to Article 22 UK GDPR — all AI-generated outputs are subject to human analyst review and approval before entering the case record. No solely automated decisions with legal or similarly significant effects are made.

Special Category Data: None anticipated for standard processing. If PEP status (political opinion data) is identified, processing justified under Article 9(2)(g) DPA 2018 Schedule 1, Part 2 — substantial public interest, AML/CFT statutory purpose.

Jurisdictional Note: This template is calibrated to UK GDPR and the Data (Use and Access) Act 2025. EU data subjects: UK adequacy decision renewed 19 December 2025 until 27 December 2031 — no additional transfer mechanism required. For personal data of subjects in other jurisdictions (US, Singapore, UAE, Hong Kong, Australia), local data protection counsel should be engaged to confirm that this processing is consistent with applicable local law.`,
      data_subjects: [
        "Directors",
        "Beneficial owners",
        "Key executives",
        "Authorised signatories",
      ],
      data_categories: [
        "identity",
        "roles",
        "sanctions_pep",
        "adverse_media",
        "litigation",
      ],
      sources: [
        "Public records",
        "Corporate registries",
        "Client-provided information",
        "Screening databases",
      ],
      interest_chips: [
        "Fraud prevention",
        "Supplier risk management",
        "Compliance",
        "Protection of assets",
        "Reputational risk management",
      ],
      safeguards_access_limited: true,
      safeguards_redaction: true,
      safeguards_evidence_stored: true,
    },
    safeguards:
      `Access limited to authorised analysts and QA reviewers. Redaction applied in client-facing outputs where personal data is not directly relevant to the risk assessment. Evidence and time-stamped sources stored securely within the platform with role-based access controls and encryption at rest and in transit.`,
    retention_months: 72, // 6 years — UK Limitation Act 1980
    outcome: "proceed",
    conditions: "",
    scope_summary:
      `Standard third-party due diligence covering corporate identity, directorship, sanctions/PEP screening, adverse media and litigation. Calibrated to UK GDPR and the Data (Use and Access) Act 2025 (in force 5 February 2026). Covers Art 6(1)(f) and Art 6(1)(ea) recognised legitimate interest bases.`,
    effective_date: "2026-02-05",
    approved_by_name: "System — Pre-built Template",
    status: "final",
    version_number: 1,
  },

  // ─── TEMPLATE 2: Enhanced Corporate Intelligence ──────────────────
  {
    name: "Enhanced Corporate Intelligence",
    purpose_category: "Third-party due diligence",
    lawful_basis: "legitimate_interests",
    legitimate_interest:
      `As Standard Third-Party Due Diligence template, plus: legal obligation compliance under AML legislation; protection of the organisation from the legal and financial consequences of non-compliance; contribution to the broader public interest in preventing financial crime and sanctions evasion.

Lawful Basis Detail:
Primary: Article 6(1)(f) UK GDPR — Legitimate Interests (extended scope).
Secondary: Article 6(1)(c) UK GDPR — Legal Obligation under Money Laundering Regulations 2017, Regulation 28 (Enhanced Due Diligence requirement).
Alternative: Article 6(1)(ea) UK GDPR — Recognised Legitimate Interest (crime prevention) under DUAA 2025 where processing is specifically directed at financial crime detection.

Note on Legal Obligation basis: Where MLR 2017 Regulation 28 EDD applies, this is the primary and overriding basis. The LIA documents the proportionality of processing but the legal obligation itself establishes lawfulness.`,
    necessity:
      `Enhanced processing is necessary where standard DD has identified risk indicators, where the entity is incorporated in a high-risk jurisdiction per FATF standards, or where the relationship value triggers the organisation's EDD threshold. Processing scope is proportionate to the heightened risk profile.`,
    less_intrusive:
      `Standard due diligence has been assessed as insufficient for entities triggering EDD requirements. The enhanced scope is the minimum necessary to satisfy MLR 2017 Regulation 28 obligations and to manage the heightened risk profile. No less intrusive alternative can deliver regulatory compliance.`,
    balancing_fields: {
      reasonable_expectations: "low",
      likely_impact: "medium",
      nature_of_processing: "moderate",
      mitigations: ["minimisation", "role_based_access", "encryption", "retention_limit", "redaction", "approval_gates"],
      notes:
        `The increased intrusiveness of enhanced processing is justified by: (a) the heightened risk profile of the entity; (b) legal obligation under MLR 2017 Regulation 28; (c) potential for significant harm to the organisation and financial system if risk is not identified; (d) professional and regulatory context reducing subjects' reasonable expectation of privacy.

Automated Processing Note: As Standard Template. Enhanced cases require Associate Director minimum approval of all AI-assisted outputs.

Special Category Data: Political opinions (PEP status) — Article 9(2)(g) UK GDPR, DPA 2018 Schedule 1 Part 2 para 6. Criminal convictions data — Article 10 UK GDPR, authorised by DPA 2018 Schedule 1 Part 2 para 6 (AML/CFT purpose). DPO notification required where organisation has a designated DPO.

Jurisdictional Note: EDD obligations under MLR 2017 apply to UK-regulated persons. Equivalent obligations exist under EU AMLD6, US Bank Secrecy Act, Singapore MAS AML Notice, UAE CBUAE AML/CFT Standards, and HK AMLO — this template's structure is consistent with international EDD documentation standards across these frameworks. Local adaptation may be required for specific jurisdictional requirements.`,
      data_subjects: [
        "Directors",
        "Beneficial owners",
        "Key executives",
        "Authorised signatories",
        "Politically exposed persons",
      ],
      data_categories: [
        "identity",
        "roles",
        "sanctions_pep",
        "adverse_media",
        "litigation",
        "criminal_offence",
        "special_category",
      ],
      sources: [
        "Public records",
        "Corporate registries",
        "Client-provided information",
        "Partner network",
        "Open-source intelligence",
        "Screening databases",
      ],
      interest_chips: [
        "Fraud prevention",
        "Supplier risk management",
        "Compliance",
        "Protection of assets",
        "Reputational risk management",
      ],
      safeguards_access_limited: true,
      safeguards_redaction: true,
      safeguards_evidence_stored: true,
    },
    safeguards:
      `All Standard template safeguards apply. Additionally: Associate Director approval gate for AI-assisted outputs; DPO notification where special category or criminal offence data is processed; enhanced audit logging for all data access; approval gates for sensitive data categories.`,
    retention_months: 84, // 7 years — MLR 2017 Regulation 40
    outcome: "proceed_with_conditions",
    conditions:
      `Processing of special category data (political opinions — PEP status) and criminal offence data requires DPO notification where a DPO is designated. Associate Director minimum approval is required for all AI-assisted outputs in enhanced cases. Retention period of 7 years from case closure applies per MLR 2017 Regulation 40, superseding the standard 6-year Limitation Act period.`,
    scope_summary:
      `Enhanced corporate intelligence covering all standard DD categories plus UBO chains, source of wealth, political exposure, regulatory enforcement, litigation history, adverse media and financial standing. Calibrated to UK GDPR, DUAA 2025, and MLR 2017 Regulation 28 EDD requirements. Covers Art 6(1)(f), Art 6(1)(c) and Art 6(1)(ea) bases.`,
    effective_date: "2026-02-05",
    approved_by_name: "System — Pre-built Template",
    status: "final",
    version_number: 1,
  },

  // ─── TEMPLATE 3: PEP and Sanctions Screening ─────────────────────
  {
    name: "PEP and Sanctions Screening",
    purpose_category: "Regulatory compliance",
    lawful_basis: "legitimate_interests",
    legitimate_interest:
      `The organisation has a legitimate interest in identifying individuals who may pose a financial crime or reputational risk due to political exposure or sanctions designation, beyond the minimum required by applicable law.

Lawful Basis Detail:
Primary: Article 6(1)(c) UK GDPR — Legal Obligation under Money Laundering Regulations 2017 (Regulations 14, 33, 35); Sanctions and Anti-Money Laundering Act 2018; The Russia (Sanctions) (EU Exit) Regulations 2019 (as amended); Financial Sanctions (EU Exit) Regulations 2020.
Alternative/Supplementary: Article 6(1)(ea) UK GDPR — Recognised Legitimate Interest (crime prevention) under Data (Use and Access) Act 2025. This basis is particularly relevant where screening extends beyond the strict minimum required by MLR 2017 — e.g. screening of lower-risk Tier C entities not technically subject to MLR EDD requirements.

Note on Recognised Legitimate Interest: Under DUAA 2025 in force from 5 February 2026, crime prevention (including financial crime prevention) is a Recognised Legitimate Interest under Article 6(1)(ea) UK GDPR. For sanctions and PEP screening, the traditional balancing test is not required when relying on this basis, provided the processing is necessary. Documenting necessity remains mandatory.`,
    necessity:
      `Screening cannot be performed without processing identity data. Data categories are limited to the minimum required for accurate matching and to reduce false positive rates. Identity data of family members and associates is processed only where they are identified as PEP-connected or sanctioned in their own right.`,
    less_intrusive:
      `Sanctions and PEP screening is a binary legal requirement — it must be performed or the organisation is in breach of statutory obligations. There is no less intrusive alternative that achieves regulatory compliance. Data categories are already limited to the minimum required for accurate matching.`,
    balancing_fields: {
      reasonable_expectations: "low",
      likely_impact: "low",
      nature_of_processing: "moderate",
      mitigations: ["minimisation", "role_based_access", "encryption", "retention_limit", "approval_gates"],
      notes:
        `Balancing Test (best practice only where Article 6(1)(ea) applies; mandatory where Article 6(1)(f) applies for supplementary processing): PEP and sanctions screening involves processing political opinion data. This is expressly authorised under Article 9(2)(g) and the public interest in preventing financial crime and sanctions evasion overrides individual privacy interests in this context.

Automated Processing: Sanctions and PEP screening involves automated matching against lists. Under DUAA 2025 amendments to Article 22 UK GDPR, this automated processing is lawful on the Recognised Legitimate Interest basis provided: (a) subjects are informed; (b) human analyst reviews all matches before case record entry; (c) false positive resolution mechanism is available. These safeguards are built into the CR platform workflow.

Special Category Data: Political opinions — Article 9(2)(g), Schedule 1 Part 2 DPA 2018, substantial public interest condition. Requires DPO notification where DPO is designated. No additional condition required where Legal Obligation basis (Art 6(1)(c)) is primary.

Jurisdictional Note: Sanctions screening obligations exist across all major jurisdictions: OFAC (US), OFSI/UK Sanctions List (UK), EU Consolidated Sanctions List, UN Security Council Consolidated List, AUSTRAC (Australia), MAS Sanctions (Singapore). This template documents UK legal compliance. Clients with regulatory obligations in other jurisdictions should confirm that screening against the applicable lists is documented under the relevant local framework.`,
      data_subjects: [
        "Directors",
        "Beneficial owners",
        "Key executives",
        "Authorised signatories",
        "Politically exposed persons",
      ],
      data_categories: [
        "identity",
        "sanctions_pep",
        "criminal_offence",
        "special_category",
      ],
      sources: [
        "Screening databases",
        "Public records",
        "Corporate registries",
        "Client-provided information",
      ],
      interest_chips: [
        "Fraud prevention",
        "Compliance",
        "Protection of assets",
        "Reputational risk management",
      ],
      safeguards_access_limited: true,
      safeguards_redaction: false,
      safeguards_evidence_stored: true,
    },
    safeguards:
      `Automated matching results are reviewed by a human analyst before entering the case record. False positive resolution mechanism is available within the platform workflow. Subjects are informed of screening where required by applicable law. DPO notification is triggered where special category data (political opinions) is processed. Access limited to authorised screening analysts with role-based controls. Encryption at rest and in transit.`,
    retention_months: 60, // 5 years — MLR 2017 Regulation 40
    outcome: "proceed_with_conditions",
    conditions:
      `Processing of political opinion data (PEP status) requires DPO notification where a DPO is designated. All automated screening matches must be reviewed by a human analyst before case record entry. Identity data of family members and associates is processed only where they are identified as PEP-connected or sanctioned in their own right. Retention: 5 years from end of relationship (MLR 2017 Regulation 40). For ongoing monitoring relationships, 5 years from last screening event or relationship termination, whichever is later.`,
    scope_summary:
      `PEP and sanctions screening covering identity, political exposure, sanctions designations, family/associate connections, and criminal offence data where applicable. Calibrated to UK GDPR, DUAA 2025, MLR 2017, SAMLA 2018, and applicable UK sanctions regulations. Covers Art 6(1)(c), Art 6(1)(ea) and supplementary Art 6(1)(f) bases.`,
    effective_date: "2026-02-05",
    approved_by_name: "System — Pre-built Template",
    status: "final",
    version_number: 1,
  },
];
