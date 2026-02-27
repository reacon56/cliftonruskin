/**
 * Canonicalisation utility for mapping country names to jurisdiction records.
 *
 * Resolution order:
 *   1. Exact ISO2 code match against jurisdiction.country_code
 *   2. Exact country_name match against jurisdiction.country_name (case-insensitive)
 *   3. Alias match against jurisdiction_alias.alias_name (case-insensitive)
 *   4. Fail → returns null (caller should log ingestion_error)
 */

/**
 * ISO 3166-1 alpha-2 → alpha-3 mapping for the most common codes.
 * Used for display / export; canonical storage is alpha-2 in `jurisdiction.country_code`.
 */
export const ISO2_TO_ISO3: Record<string, string> = {
  AF: "AFG", AL: "ALB", DZ: "DZA", AO: "AGO", AR: "ARG", AM: "ARM", AU: "AUS",
  AT: "AUT", AZ: "AZE", BS: "BHS", BH: "BHR", BD: "BGD", BB: "BRB", BY: "BLR",
  BE: "BEL", BZ: "BLZ", BJ: "BEN", BM: "BMU", BO: "BOL", BA: "BIH", BW: "BWA",
  BR: "BRA", BN: "BRN", BG: "BGR", KH: "KHM", CM: "CMR", CA: "CAN", KY: "CYM",
  CL: "CHL", CN: "CHN", CO: "COL", CD: "COD", CR: "CRI", CI: "CIV", HR: "HRV",
  CU: "CUB", CY: "CYP", CZ: "CZE", DK: "DNK", DO: "DOM", EC: "ECU", EG: "EGY",
  SV: "SLV", EE: "EST", ET: "ETH", FI: "FIN", FR: "FRA", GE: "GEO", DE: "DEU",
  GH: "GHA", GI: "GIB", GR: "GRC", GG: "GGY", HK: "HKG", HU: "HUN", IS: "ISL",
  IN: "IND", ID: "IDN", IR: "IRN", IQ: "IRQ", IE: "IRL", IM: "IMN", IL: "ISR",
  IT: "ITA", JM: "JAM", JP: "JPN", JE: "JEY", JO: "JOR", KZ: "KAZ", KE: "KEN",
  KP: "PRK", KR: "KOR", KW: "KWT", LV: "LVA", LB: "LBN", LI: "LIE", LT: "LTU",
  LU: "LUX", MO: "MAC", MG: "MDG", MY: "MYS", MT: "MLT", MH: "MHL", MU: "MUS",
  MX: "MEX", MC: "MCO", MN: "MNG", ME: "MNE", MA: "MAR", MZ: "MOZ", MM: "MMR",
  NA: "NAM", NL: "NLD", NZ: "NZL", NG: "NGA", NO: "NOR", OM: "OMN", PK: "PAK",
  PA: "PAN", PY: "PRY", PE: "PER", PH: "PHL", PL: "POL", PT: "PRT", QA: "QAT",
  RO: "ROU", RU: "RUS", RW: "RWA", SA: "SAU", SC: "SYC", SG: "SGP", SK: "SVK",
  SI: "SVN", SO: "SOM", ZA: "ZAF", ES: "ESP", LK: "LKA", SD: "SDN", SE: "SWE",
  CH: "CHE", SY: "SYR", TW: "TWN", TZ: "TZA", TH: "THA", TT: "TTO", TN: "TUN",
  TR: "TUR", UA: "UKR", AE: "ARE", GB: "GBR", US: "USA", UY: "URY", UZ: "UZB",
  VE: "VEN", VN: "VNM", VG: "VGB", YE: "YEM", ZM: "ZMB", ZW: "ZWE", LY: "LBY",
};

export function iso2ToIso3(code: string): string | null {
  return ISO2_TO_ISO3[code.toUpperCase()] ?? null;
}

export type JurisdictionRecord = {
  id: string;
  country_code: string;
  country_name: string;
};

export type JurisdictionAlias = {
  jurisdiction_id: string;
  alias_name: string;
};

export type CanonicaliseResult =
  | { matched: true; jurisdiction: JurisdictionRecord; matchType: "iso_code" | "name" | "alias" }
  | { matched: false; input: string };

/**
 * Resolve an input string (could be ISO code, country name, or alias)
 * to a canonical jurisdiction record.
 */
export function canonicalise(
  input: string,
  jurisdictions: JurisdictionRecord[],
  aliases: JurisdictionAlias[]
): CanonicaliseResult {
  const trimmed = input.trim();
  if (!trimmed) return { matched: false, input };

  const upper = trimmed.toUpperCase();
  const lower = trimmed.toLowerCase();

  // 1. Exact ISO2 code match
  const byCode = jurisdictions.find((j) => j.country_code.toUpperCase() === upper);
  if (byCode) return { matched: true, jurisdiction: byCode, matchType: "iso_code" };

  // 2. Country name match (case-insensitive)
  const byName = jurisdictions.find((j) => j.country_name.toLowerCase() === lower);
  if (byName) return { matched: true, jurisdiction: byName, matchType: "name" };

  // 3. Alias match (case-insensitive)
  const aliasMatch = aliases.find((a) => a.alias_name.toLowerCase() === lower);
  if (aliasMatch) {
    const j = jurisdictions.find((j) => j.id === aliasMatch.jurisdiction_id);
    if (j) return { matched: true, jurisdiction: j, matchType: "alias" };
  }

  return { matched: false, input: trimmed };
}
