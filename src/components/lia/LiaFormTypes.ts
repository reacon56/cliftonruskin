export interface LiaFormState {
  purpose: string;
  legitimate_interest: string;
  legitimate_interest_chips: string[];
  necessity: string;
  necessity_alternatives: string;
  data_subjects: string[];
  data_categories: string[];
  sources: string[];
  special_category_requested: boolean;
  criminal_offence_requested: boolean;
  balancing_reasonable_expectations: string; // low/medium/high
  balancing_likely_impact: string;
  balancing_nature_of_processing: string; // limited/moderate/extensive
  balancing_mitigations: string[];
  balancing_notes: string;
  safeguards: string;
  safeguards_access_limited: boolean;
  safeguards_redaction: boolean;
  safeguards_evidence_stored: boolean;
  retention_months: number | null;
  outcome: string; // proceed / proceed_with_conditions / do_not_proceed
  conditions: string;
}

export const LIA_INITIAL: LiaFormState = {
  purpose: "",
  legitimate_interest: "",
  legitimate_interest_chips: [],
  necessity: "",
  necessity_alternatives: "",
  data_subjects: [],
  data_categories: [],
  sources: [],
  special_category_requested: false,
  criminal_offence_requested: false,
  balancing_reasonable_expectations: "",
  balancing_likely_impact: "",
  balancing_nature_of_processing: "",
  balancing_mitigations: [],
  balancing_notes: "",
  safeguards: "",
  safeguards_access_limited: false,
  safeguards_redaction: false,
  safeguards_evidence_stored: false,
  retention_months: null,
  outcome: "",
  conditions: "",
};

export const INTEREST_CHIPS = [
  "Fraud prevention",
  "Supplier risk management",
  "Compliance",
  "Protection of assets",
  "Reputational risk management",
];

export const DATA_SUBJECT_OPTIONS = [
  "Directors",
  "Beneficial owners",
  "Key executives",
  "Authorised signatories",
  "Politically exposed persons",
];

export const DATA_CATEGORY_OPTIONS = [
  { value: "identity", label: "Identity details" },
  { value: "roles", label: "Directorships / roles" },
  { value: "sanctions_pep", label: "Sanctions / PEP screening" },
  { value: "adverse_media", label: "Adverse media" },
  { value: "litigation", label: "Litigation / court records" },
  { value: "social_media", label: "Social media / online presence" },
  { value: "criminal_offence", label: "Criminal offence data" },
  { value: "special_category", label: "Special category data" },
];

export const SOURCE_OPTIONS = [
  "Public records",
  "Corporate registries",
  "Client-provided information",
  "Partner network",
  "Open-source intelligence",
  "Screening databases",
];

export const MITIGATION_OPTIONS = [
  { value: "minimisation", label: "Data minimisation" },
  { value: "role_based_access", label: "Role-based access controls" },
  { value: "encryption", label: "Encryption at rest and in transit" },
  { value: "retention_limit", label: "Retention time limit" },
  { value: "redaction", label: "Redaction in client-facing outputs" },
  { value: "approval_gates", label: "Approval gates for sensitive categories" },
];
