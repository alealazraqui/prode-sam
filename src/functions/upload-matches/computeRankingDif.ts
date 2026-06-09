import type { ComputedRankingEntry, UserRankingEntry } from './types';

export function computeRankingDifForEntry(
  previousPosition: number | undefined,
  newPosition: number,
): number {
  if (previousPosition === undefined || previousPosition <= 0) {
    return 0;
  }

  return previousPosition - newPosition;
}

export function applyRankingDif(
  ranking: ComputedRankingEntry[],
  previousPositions: Map<string, number>,
): UserRankingEntry[] {
  return ranking.map((entry) => ({
    ...entry,
    rankingDif: computeRankingDifForEntry(
      previousPositions.get(entry.username),
      entry.rankingPosition,
    ),
  }));
}
