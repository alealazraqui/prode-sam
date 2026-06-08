import type { PredictionItem } from '@/shared/types/predictionItem';
import type { StealPickItem } from '@/shared/types/stealPickItem';
import { computeUserScore } from './computeUserScore';

export function computeUserScores(
  predictionsByUser: Map<string, PredictionItem[]>,
  allStealPicks: StealPickItem[],
  now: Date,
): Map<string, number> {
  const userScores = new Map<string, number>();

  for (const [username, predictions] of predictionsByUser) {
    const userStealPicks = allStealPicks.filter(
      (sp) => sp.stealerUsername === username || sp.victimUsername === username,
    );
    userScores.set(username, computeUserScore(predictions, userStealPicks, username, now));
  }

  return userScores;
}
