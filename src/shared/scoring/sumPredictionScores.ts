import type { PredictionScore } from './types';

export function sumPredictionScores(scores: PredictionScore[]): PredictionScore {
  return scores.reduce(
    (acc, score) => ({
      pointsCommon: acc.pointsCommon + score.pointsCommon,
    }),
    { pointsCommon: 0 },
  );
}
