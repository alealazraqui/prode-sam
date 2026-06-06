import { scoreCalculator } from '@/shared/scoring/scoreCalculator';
import { sumPredictionScores } from '@/shared/scoring/sumPredictionScores';
import type { ScoringMatchInput } from '@/shared/scoring/types';
import { totalScore } from '@/shared/scoring/totalScore';
import type { PredictionItem } from '@/shared/types/predictionItem';

export function computeUserScore(
  predictions: PredictionItem[],
  matchLookup: Map<string, ScoringMatchInput>,
  now: Date,
): number {
  const eligiblePredictions = predictions.filter(
    (prediction) => new Date(prediction.kickoffAt) < now,
  );

  const scores = eligiblePredictions.map((prediction) => {
    const match = matchLookup.get(prediction.matchId);
    if (!match) {
      return { pointsCommon: 0 };
    }
    return scoreCalculator(prediction, match);
  });

  return totalScore(sumPredictionScores(scores));
}
