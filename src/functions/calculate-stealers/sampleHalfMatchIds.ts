/**
 * Returns a random sample of `count` match IDs from the given list.
 * When `count` is omitted it defaults to ceil(N/2).
 */
export function sampleHalfMatchIds(matchIds: string[], count?: number): string[] {
  const sampleCount = count ?? Math.ceil(matchIds.length / 2);
  const shuffled = [...matchIds];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled.slice(0, sampleCount);
}
