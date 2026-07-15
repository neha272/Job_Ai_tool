// Heuristic "is this a US-based role?" for the discovery hard-filter.
// Conservative: a posting is kept only if its location AFFIRMATIVELY looks US
// (a US state, "United States"/"USA"/"US", or a US-tagged remote). Bare
// "Remote", empty, or clearly-foreign locations are dropped.

const US_STATE_CODES = new Set([
  "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA",
  "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD",
  "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ",
  "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC",
  "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY", "DC",
]);

const US_STATE_NAMES = [
  "alabama", "alaska", "arizona", "arkansas", "california", "colorado",
  "connecticut", "delaware", "florida", "georgia", "hawaii", "idaho",
  "illinois", "indiana", "iowa", "kansas", "kentucky", "louisiana", "maine",
  "maryland", "massachusetts", "michigan", "minnesota", "mississippi",
  "missouri", "montana", "nebraska", "nevada", "new hampshire", "new jersey",
  "new mexico", "new york", "north carolina", "north dakota", "ohio",
  "oklahoma", "oregon", "pennsylvania", "rhode island", "south carolina",
  "south dakota", "tennessee", "texas", "utah", "vermont", "virginia",
  "washington", "west virginia", "wisconsin", "wyoming",
];

export function isUsLocation(loc: string | null | undefined): boolean {
  if (!loc || !loc.trim()) return false;
  const s = loc.toLowerCase();

  if (/\bunited states\b|\bu\.?s\.?a\.?\b|\busa\b/.test(s)) return true;

  // "City, ST" — a US state code after a comma.
  const codes = [...loc.matchAll(/,\s*([A-Za-z]{2})\b/g)].map((m) =>
    m[1].toUpperCase(),
  );
  if (codes.some((c) => US_STATE_CODES.has(c))) return true;

  // A full US state name anywhere.
  if (US_STATE_NAMES.some((name) => s.includes(name))) return true;

  // Standalone "US" token (e.g. "Remote, US", "Remote - US").
  if (/\bus\b/.test(s)) return true;

  return false;
}
