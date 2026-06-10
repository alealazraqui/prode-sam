/**
 * Returns a random sample of ceil(N/2) match IDs from the given list.
 * This limits each stealer to half the available matches (rounded up for odd counts).
 */
export function sampleHalfMatchIds(matchIds: string[]): string[] {
  const count = Math.ceil(matchIds.length / 2);
  const shuffled = [...matchIds].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}
