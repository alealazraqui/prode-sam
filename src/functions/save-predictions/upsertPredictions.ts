import { environment } from '@/shared/config/environment';
import { putItem } from '@/shared/dynamo/putItem';
import type { MatchItem } from '@/functions/get-matches/types';
import type { PredictionItem } from '@/shared/types/predictionItem';
import type { SavePredictionInput } from './types';

export async function upsertPredictions(
  username: string,
  predictions: SavePredictionInput[],
  matchLookup: Map<string, MatchItem>,
): Promise<void> {
  const updatedAt = new Date().toISOString();

  await Promise.all(
    predictions.map((prediction) => {
      const match = matchLookup.get(prediction.matchId)!;

      const item: PredictionItem = {
        username,
        matchId: prediction.matchId,
        homeGoals: prediction.homeGoals,
        awayGoals: prediction.awayGoals,
        updatedAt,
        kickoffAt: match.kickoffAt,
      };

      return putItem(environment.predictionsTableName, item);
    }),
  );
}
