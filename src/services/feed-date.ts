/**
 * Parse a feed date string into a Date object.
 * Returns null if the value is empty, missing, or unparseable —
 * callers should skip items with no valid publish date.
 */
export function parseFeedDate(value: string | null | undefined): Date | null {
  if (!value || !value.trim()) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}
