import type { PredictionItem } from '@/shared/types/predictionItem';
import type { StealPickItem } from '@/shared/types/stealPickItem';

export function computeUserScore(
  predictions: PredictionItem[],
  stealPicks: StealPickItem[],
  username: string,
  now: Date,
): number {
  const predictionScore = predictions
    .filter((p) => new Date(p.kickoffAt) < now)
    .reduce((sum, p) => sum + (p.pointsCommon ?? 0), 0);

  const stealDelta = stealPicks.reduce((sum, sp) => {
    if (sp.stealerUsername === username) return sum + sp.stolenPoints;
    if (sp.victimUsername === username) return sum - sp.stolenPoints;
    return sum;
  }, 0);

  return predictionScore + stealDelta;
}
