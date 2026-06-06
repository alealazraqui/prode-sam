import type { PredictionItem } from '@/shared/types/predictionItem';
import { commonRule } from './commonRule';
import type { PredictionScore, ScoringMatchInput } from './types';

export function scoreCalculator(
  prediction: PredictionItem,
  match: ScoringMatchInput,
): PredictionScore {
  return {
    pointsCommon: commonRule(prediction, match),
  };
}
