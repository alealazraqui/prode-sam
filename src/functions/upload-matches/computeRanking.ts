import type { UserRankingEntry } from './types';

export function computeRanking(userScores: Map<string, number>): UserRankingEntry[] {
  const sorted = [...userScores.entries()].sort(([, leftScore], [, rightScore]) => {
    return rightScore - leftScore;
  });

  const ranking: UserRankingEntry[] = [];

  for (let index = 0; index < sorted.length; index += 1) {
    const [username, score] = sorted[index];
    const previousScore = index > 0 ? sorted[index - 1][1] : undefined;
    const rankingPosition =
      index > 0 && score === previousScore ? ranking[index - 1].rankingPosition : index + 1;

    ranking.push({ username, score, rankingPosition });
  }

  return ranking;
}
