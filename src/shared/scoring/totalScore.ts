import type { PredictionScore } from './types';

/** Sums all rule fields into the user's final score. Extend when new rules are added. */
export function totalScore(score: PredictionScore): number {
  return score.pointsCommon;
}
