import type { AlterPickItem } from '@/shared/types/alteration';
import type { PredictionItem } from '@/shared/types/predictionItem';

function applyDelta(value: number, delta: number): number {
  return Math.max(0, value + delta);
}

export function applyAlterPickToPrediction(
  prediction: PredictionItem,
  alterPick: AlterPickItem,
): PredictionItem {
  if (alterPick.side === 'home') {
    return {
      ...prediction,
      homeGoals: applyDelta(prediction.homeGoals, alterPick.delta),
    };
  }

  return {
    ...prediction,
    awayGoals: applyDelta(prediction.awayGoals, alterPick.delta),
  };
}
