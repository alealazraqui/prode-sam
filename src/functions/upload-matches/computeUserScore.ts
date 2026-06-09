import type { LineupPickItem } from '@/shared/types/lineupPickItem';
import type { PredictionItem } from '@/shared/types/predictionItem';
import type { StealPickItem } from '@/shared/types/stealPickItem';

export function computeUserScore(
  predictions: PredictionItem[],
  stealPicks: StealPickItem[],
  lineupPicks: LineupPickItem[],
  username: string,
): number {
  const predictionScore = predictions.reduce((sum, p) => sum + (p.pointsCommon ?? 0), 0);

  const stealDelta = stealPicks.reduce((sum, sp) => {
    if (sp.stealerUsername === username) return sum + sp.stolenPoints;
    if (sp.victimUsername === username) return sum - sp.stolenPoints;
    return sum;
  }, 0);

  const lineupScore = lineupPicks
    .filter((pick) => pick.username === username)
    .reduce((sum, pick) => sum + (pick.points ?? 0), 0);

  return predictionScore + stealDelta + lineupScore;
}
