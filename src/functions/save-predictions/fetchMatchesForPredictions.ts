import { environment } from '@/shared/config/environment';
import { getItem } from '@/shared/dynamo/getItem';
import { BadRequestError } from '@/shared/errors/BadRequestError';
import type { MatchItem } from '@/functions/get-matches/types';
import type { SavePredictionInput } from './types';

const UNKNOWN_MATCH_MESSAGE = 'Unknown matchId:';

export async function fetchMatchesForPredictions(
  predictions: SavePredictionInput[],
): Promise<Map<string, MatchItem>> {
  const uniqueMatchIds = [...new Set(predictions.map((prediction) => prediction.matchId))];

  const entries = await Promise.all(
    uniqueMatchIds.map(async (matchId) => {
      const match = await getItem<MatchItem>(environment.matchesTableName, { matchId });

      if (!match) {
        throw new BadRequestError(`${UNKNOWN_MATCH_MESSAGE} ${matchId}`);
      }

      return [matchId, match] as const;
    }),
  );

  return new Map(entries);
}
