import { environment } from '@/shared/config/environment';
import { putItem } from '@/shared/dynamo/putItem';
import { scanTable } from '@/shared/dynamo/scanTable';
import { scoreCalculator } from '@/shared/scoring/scoreCalculator';
import type { ScoringMatchInput } from '@/shared/scoring/types';
import type { AlterPickItem } from '@/shared/types/alteration';
import type { PredictionItem } from '@/shared/types/predictionItem';
import { applyAlterPickToPrediction } from './applyAlterPickToPrediction';
import type { UploadMatchInput } from './types';

function buildMatchLookup(persistedMatches: UploadMatchInput[]): Map<string, ScoringMatchInput> {
  return new Map(
    persistedMatches.map((match) => [
      match.matchId,
      { status: 2, homeGoals: match.homeGoals, awayGoals: match.awayGoals },
    ]),
  );
}

function buildAlterPickLookup(
  alterPicks: AlterPickItem[],
  persistedMatchIds: Set<string>,
): Map<string, AlterPickItem> {
  const lookup = new Map<string, AlterPickItem>();

  for (const alterPick of alterPicks) {
    if (!persistedMatchIds.has(alterPick.matchId)) continue;

    const key = getAlterPickLookupKey(alterPick.victimUsername, alterPick.matchId);
    if (!lookup.has(key)) {
      lookup.set(key, alterPick);
    }
  }

  return lookup;
}

function getAlterPickLookupKey(username: string, matchId: string): string {
  return `${username}:${matchId}`;
}

function resolveScoringPrediction(
  prediction: PredictionItem,
  alterPickLookup: Map<string, AlterPickItem>,
): PredictionItem {
  const alterPick = alterPickLookup.get(
    getAlterPickLookupKey(prediction.username, prediction.matchId),
  );

  if (alterPick == null) {
    return prediction;
  }

  return applyAlterPickToPrediction(prediction, alterPick);
}

export async function updatePredictionPoints(persistedMatches: UploadMatchInput[]): Promise<void> {
  if (persistedMatches.length === 0) return;

  const matchLookup = buildMatchLookup(persistedMatches);
  const persistedMatchIds = new Set(matchLookup.keys());
  const [allPredictions, alterPicks] = await Promise.all([
    scanTable<PredictionItem>(environment.predictionsTableName),
    scanTable<AlterPickItem>(environment.alterPicksTableName),
  ]);
  const alterPickLookup = buildAlterPickLookup(alterPicks, persistedMatchIds);

  await Promise.all(
    allPredictions
      .filter((prediction) => matchLookup.has(prediction.matchId))
      .map(async (prediction) => {
        const match = matchLookup.get(prediction.matchId)!;
        const scoringPrediction = resolveScoringPrediction(prediction, alterPickLookup);
        const pointsCommon = scoreCalculator(scoringPrediction, match).pointsCommon;
        await putItem(environment.predictionsTableName, { ...prediction, pointsCommon });
      }),
  );
}
