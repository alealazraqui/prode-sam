import { environment } from '@/shared/config/environment';
import { putItem } from '@/shared/dynamo/putItem';
import { scanTable } from '@/shared/dynamo/scanTable';
import type { PredictionItem } from '@/shared/types/predictionItem';
import type { StealPickItem } from '@/shared/types/stealPickItem';

export async function updateStealPicksStolenPoints(
  uploadedMatchIds: ReadonlySet<string>,
): Promise<void> {
  if (uploadedMatchIds.size === 0) return;

  const [allPredictions, stealPicks] = await Promise.all([
    scanTable<PredictionItem>(environment.predictionsTableName),
    scanTable<StealPickItem>(environment.stealPicksTableName),
  ]);

  await Promise.all(
    stealPicks
      .filter((sp) => uploadedMatchIds.has(sp.matchId))
      .map(async (sp) => {
        const victimPrediction = allPredictions.find(
          (p) => p.username === sp.victimUsername && p.matchId === sp.matchId,
        );
        await putItem(environment.stealPicksTableName, {
          ...sp,
          stolenPoints: victimPrediction?.pointsCommon ?? 0,
        });
      }),
  );
}
