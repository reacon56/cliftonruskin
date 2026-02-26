/**
 * Simple fuzzy name matching utility for entity deduplication.
 * Uses Levenshtein-based similarity + jurisdiction matching.
 */

function levenshtein(a: string, b: string): number {
  const m = a.length, n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[m][n];
}

function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/\b(ltd|limited|inc|incorporated|corp|corporation|plc|llc|gmbh|sa|ag|bv|nv|pty)\b/gi, "")
    .replace(/[^a-z0-9 ]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export interface MatchResult {
  masterId: string;
  masterName: string;
  jurisdiction: string | null;
  registrationNumber: string | null;
  similarity: number; // 0-100
  jurisdictionMatch: boolean;
}

export function findMasterMatches(
  entityName: string,
  entityJurisdiction: string | null,
  masterEntities: Array<{
    id: string;
    canonical_name: string;
    jurisdiction_incorporation: string | null;
    canonical_registration_number: string | null;
  }>,
  threshold = 60
): MatchResult[] {
  const normEntity = normalize(entityName);
  if (!normEntity) return [];

  const results: MatchResult[] = [];

  for (const me of masterEntities) {
    const normMaster = normalize(me.canonical_name);
    if (!normMaster) continue;

    // Calculate similarity
    const maxLen = Math.max(normEntity.length, normMaster.length);
    const dist = levenshtein(normEntity, normMaster);
    const similarity = Math.round((1 - dist / maxLen) * 100);

    // Jurisdiction match bonus
    const jurisdictionMatch = !!(
      entityJurisdiction &&
      me.jurisdiction_incorporation &&
      entityJurisdiction.toLowerCase().trim() === me.jurisdiction_incorporation.toLowerCase().trim()
    );

    // Boost score if jurisdiction matches
    const boosted = jurisdictionMatch ? Math.min(100, similarity + 10) : similarity;

    if (boosted >= threshold) {
      results.push({
        masterId: me.id,
        masterName: me.canonical_name,
        jurisdiction: me.jurisdiction_incorporation,
        registrationNumber: me.canonical_registration_number,
        similarity: boosted,
        jurisdictionMatch,
      });
    }
  }

  return results.sort((a, b) => b.similarity - a.similarity).slice(0, 5);
}
