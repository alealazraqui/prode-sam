import type { PredictionItem } from '@/shared/types/predictionItem';
import type { PredictionResponse } from './types';

export function mapPredictionToResponse(item: PredictionItem): PredictionResponse {
  return {
    username: item.username,
    matchId: item.matchId,
    homeGoals: item.homeGoals,
    awayGoals: item.awayGoals,
    updatedAt: item.updatedAt,
    pointsCommon: item.pointsCommon ?? null,
  };
}
