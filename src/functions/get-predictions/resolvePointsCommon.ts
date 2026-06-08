import type { MatchItem } from '@/functions/get-matches/types';
import { scoreCalculator } from '@/shared/scoring/scoreCalculator';
import type { ScoringMatchInput } from '@/shared/scoring/types';
import type { PredictionItem } from '@/shared/types/predictionItem';

function buildFinishedMatchLookup(matches: MatchItem[]): Map<string, ScoringMatchInput> {
  const lookup = new Map<string, ScoringMatchInput>();

  for (const match of matches) {
    if (match.status !== 2 || match.homeGoals == null || match.awayGoals == null) {
      continue;
    }

    lookup.set(match.matchId, {
      status: 2,
      homeGoals: match.homeGoals,
      awayGoals: match.awayGoals,
    });
  }

  return lookup;
}

export function resolvePointsCommon(
  item: PredictionItem,
  finishedMatchesById: Map<string, ScoringMatchInput>,
): number | null {
  if (item.pointsCommon != null) {
    return item.pointsCommon;
  }

  const match = finishedMatchesById.get(item.matchId);
  if (!match) {
    return null;
  }

  return scoreCalculator(item, match).pointsCommon;
}

export function buildFinishedMatchLookupFromItems(
  matches: MatchItem[],
): Map<string, ScoringMatchInput> {
  return buildFinishedMatchLookup(matches);
}
