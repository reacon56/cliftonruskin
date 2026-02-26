/**
 * Jurisdiction region mapping and risk classification
 * for the Ownership & Structure intelligence overlay.
 */

export type JurisdictionRegion =
  | "EU"
  | "GCC"
  | "Offshore"
  | "APAC"
  | "Americas"
  | "Africa"
  | "CIS"
  | "Other";

const REGION_MAP: Record<string, JurisdictionRegion> = {
  // EU
  GB: "EU", DE: "EU", FR: "EU", NL: "EU", BE: "EU", IT: "EU", ES: "EU",
  PT: "EU", IE: "EU", AT: "EU", SE: "EU", DK: "EU", FI: "EU", NO: "EU",
  PL: "EU", CZ: "EU", HU: "EU", RO: "EU", BG: "EU", HR: "EU", SK: "EU",
  SI: "EU", LT: "EU", LV: "EU", EE: "EU", CY: "EU", MT: "EU", LU: "EU",
  GR: "EU", CH: "EU", LI: "EU", IS: "EU",
  // GCC
  AE: "GCC", SA: "GCC", QA: "GCC", KW: "GCC", BH: "GCC", OM: "GCC",
  // Offshore
  KY: "Offshore", VG: "Offshore", BM: "Offshore", JE: "Offshore",
  GG: "Offshore", IM: "Offshore", GI: "Offshore", PA: "Offshore",
  BS: "Offshore", SC: "Offshore", MU: "Offshore", MH: "Offshore",
  // APAC
  CN: "APAC", HK: "APAC", SG: "APAC", JP: "APAC", KR: "APAC",
  AU: "APAC", NZ: "APAC", IN: "APAC", TH: "APAC", MY: "APAC",
  PH: "APAC", ID: "APAC", VN: "APAC", TW: "APAC",
  // Americas
  US: "Americas", CA: "Americas", MX: "Americas", BR: "Americas",
  AR: "Americas", CL: "Americas", CO: "Americas", PE: "Americas",
  // Africa
  ZA: "Africa", NG: "Africa", KE: "Africa", GH: "Africa", EG: "Africa",
  MA: "Africa", TZ: "Africa",
  // CIS
  RU: "CIS", UA: "CIS", KZ: "CIS", UZ: "CIS", GE: "CIS", AZ: "CIS",
};

export function getJurisdictionRegion(code: string | null | undefined): JurisdictionRegion {
  if (!code) return "Other";
  return REGION_MAP[code.toUpperCase()] || "Other";
}

/** HSL tint colours for jurisdiction overlay — very muted for dark canvas */
export const JURISDICTION_TINTS: Record<JurisdictionRegion, string> = {
  EU: "hsl(210, 30%, 28%)",
  GCC: "hsl(38, 25%, 25%)",
  Offshore: "hsl(280, 20%, 25%)",
  APAC: "hsl(170, 20%, 24%)",
  Americas: "hsl(200, 25%, 26%)",
  Africa: "hsl(30, 20%, 24%)",
  CIS: "hsl(350, 15%, 24%)",
  Other: "hsl(220, 15%, 22%)",
};

export const JURISDICTION_LABELS: Record<JurisdictionRegion, string> = {
  EU: "Europe",
  GCC: "Gulf States",
  Offshore: "Offshore",
  APAC: "Asia-Pacific",
  Americas: "Americas",
  Africa: "Africa",
  CIS: "CIS / Former Soviet",
  Other: "Other",
};

/** High-risk / sanctioned jurisdictions for mismatch detection */
const HIGH_RISK_CODES = new Set([
  "KP", "IR", "SY", "CU", "VE", "MM", "AF", "YE", "SO", "SD", "LY",
  "KY", "VG", "PA", "BS", "SC", "MH",
]);

export function isHighRiskJurisdiction(code: string | null | undefined): boolean {
  if (!code) return false;
  return HIGH_RISK_CODES.has(code.toUpperCase());
}

export interface RiskMismatch {
  entityId: string;
  type: "jurisdiction_mismatch" | "high_risk_chain" | "high_risk_ubo";
  description: string;
}

export function detectRiskMismatches(
  nodes: Array<{
    id: string;
    name: string;
    incorporation_country_code: string | null;
    hq_country_code: string | null;
  }>,
  edges: Array<{
    source: string;
    target: string;
    relationship_type: string;
  }>
): RiskMismatch[] {
  const mismatches: RiskMismatch[] = [];
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));

  for (const node of nodes) {
    const inc = node.incorporation_country_code?.toUpperCase();
    const hq = node.hq_country_code?.toUpperCase();

    // INC ≠ HQ
    if (inc && hq && inc !== hq) {
      mismatches.push({
        entityId: node.id,
        type: "jurisdiction_mismatch",
        description: `Incorporated in ${inc}. Operational HQ in ${hq}. Jurisdiction mismatch.`,
      });
    }

    // High-risk jurisdiction
    if (isHighRiskJurisdiction(inc) || isHighRiskJurisdiction(hq)) {
      const loc = isHighRiskJurisdiction(inc) ? inc : hq;
      mismatches.push({
        entityId: node.id,
        type: "high_risk_chain",
        description: `Presence in high-risk jurisdiction: ${loc}.`,
      });
    }
  }

  // UBOs in high-risk jurisdictions
  const uboEdges = edges.filter((e) => e.relationship_type === "ubo");
  for (const edge of uboEdges) {
    const uboNode = nodeMap.get(edge.source);
    if (uboNode) {
      const code = uboNode.hq_country_code || uboNode.incorporation_country_code;
      if (isHighRiskJurisdiction(code)) {
        mismatches.push({
          entityId: uboNode.id,
          type: "high_risk_ubo",
          description: `UBO located in sanctioned/high-risk jurisdiction: ${code?.toUpperCase()}.`,
        });
      }
    }
  }

  return mismatches;
}
