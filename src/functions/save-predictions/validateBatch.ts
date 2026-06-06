import type { MatchItem } from '@/functions/get-matches/types';
import { ConflictError } from '@/shared/errors/ConflictError';
import type { SavePredictionInput } from './types';

export function validateBatch(
  predictions: SavePredictionInput[],
  matchLookup: Map<string, MatchItem>,
): void {
  const nowIso = new Date().toISOString();
  const lockedMatchIds = predictions
    .map((prediction) => prediction.matchId)
    .filter((matchId, index, matchIds) => {
      if (matchIds.indexOf(matchId) !== index) {
        return false;
      }

      const kickoffAt = matchLookup.get(matchId)?.kickoffAt;

      if (!kickoffAt) {
        return false;
      }

      return kickoffAt <= nowIso;
    });

  if (lockedMatchIds.length === 0) {
    return;
  }

  throw new ConflictError(`Predictions locked for matches: ${lockedMatchIds.join(', ')}`);
}
