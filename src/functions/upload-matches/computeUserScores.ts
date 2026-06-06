import type { ScoringMatchInput } from '@/shared/scoring/types';
import type { PredictionItem } from '@/shared/types/predictionItem';
import { computeUserScore } from './computeUserScore';

export function computeUserScores(
  predictionsByUser: Map<string, PredictionItem[]>,
  matchLookup: Map<string, ScoringMatchInput>,
  now: Date,
): Map<string, number> {
  const userScores = new Map<string, number>();

  for (const [username, predictions] of predictionsByUser) {
    userScores.set(username, computeUserScore(predictions, matchLookup, now));
  }

  return userScores;
}
