import type { PredictionItem } from '@/shared/types/predictionItem';
import type { ScoringMatchInput } from './types';

type ResultSign = 'H' | 'A' | 'D';

function getResultSign(homeGoals: number, awayGoals: number): ResultSign {
  if (homeGoals > awayGoals) {
    return 'H';
  }
  if (homeGoals < awayGoals) {
    return 'A';
  }
  return 'D';
}

export function commonRule(prediction: PredictionItem, match: ScoringMatchInput): number {
  if (match.status !== 2) {
    return 0;
  }

  const matchHomeGoals = match.homeGoals ?? 0;
  const matchAwayGoals = match.awayGoals ?? 0;

  if (prediction.homeGoals === matchHomeGoals && prediction.awayGoals === matchAwayGoals) {
    return 3;
  }

  const matchSign = getResultSign(matchHomeGoals, matchAwayGoals);
  const predictionSign = getResultSign(prediction.homeGoals, prediction.awayGoals);

  if (matchSign === predictionSign) {
    return 1;
  }

  return 0;
}
