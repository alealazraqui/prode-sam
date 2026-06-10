import type { MatchItem } from '@/functions/get-matches/types';

export function getEarliestKickoffAt(matches: MatchItem[]): string | null {
  if (matches.length === 0) {
    return null;
  }

  return matches.reduce(
    (earliest, match) => (match.kickoffAt < earliest ? match.kickoffAt : earliest),
    matches[0].kickoffAt,
  );
}
