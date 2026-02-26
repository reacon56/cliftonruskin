/**
 * Convert an ISO 3166-1 alpha-2 country code to a flag emoji.
 * Works by mapping each letter to its regional indicator symbol.
 */
export function countryCodeToFlag(code: string | null | undefined): string | null {
  if (!code || code.length !== 2) return null;
  const upper = code.toUpperCase();
  const codePoints = [...upper].map(
    (char) => 0x1f1e6 + char.charCodeAt(0) - 65
  );
  return String.fromCodePoint(...codePoints);
}
