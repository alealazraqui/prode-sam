import { getArgentinaDateStringFromIso } from '@/functions/steal-picks/getArgentinaDateStringFromIso';
import { environment } from '@/shared/config/environment';
import { getDayType } from '@/shared/dynamo/getDayType';
import { putItem } from '@/shared/dynamo/putItem';
import { scanTable } from '@/shared/dynamo/scanTable';
import { DayEventType } from '@/shared/types/dayEventType';
import type { PredictionItem } from '@/shared/types/predictionItem';
import type { StealPickItem } from '@/shared/types/stealPickItem';
import type { UploadMatchInput } from './types';

async function resolveRoboMatchIds(persistedMatches: ReadonlyArray<UploadMatchInput>): Promise<Set<string>> {
  const matchIdsByCalendarDate = new Map<string, Set<string>>();

  for (const match of persistedMatches) {
    const calendarDate = getArgentinaDateStringFromIso(match.kickoffAt);
    const matchIds = matchIdsByCalendarDate.get(calendarDate) ?? new Set<string>();
    matchIds.add(match.matchId);
    matchIdsByCalendarDate.set(calendarDate, matchIds);
  }

  const roboMatchIds = new Set<string>();

  for (const [calendarDate, matchIds] of matchIdsByCalendarDate) {
    const dayType = await getDayType(calendarDate);
    if (dayType !== DayEventType.Robo) continue;

    for (const matchId of matchIds) {
      roboMatchIds.add(matchId);
    }
  }

  return roboMatchIds;
}

export async function updateStealPicksStolenPoints(
  persistedMatches: ReadonlyArray<UploadMatchInput>,
): Promise<void> {
  if (persistedMatches.length === 0) return;

  const roboMatchIds = await resolveRoboMatchIds(persistedMatches);
  if (roboMatchIds.size === 0) return;

  const [allPredictions, stealPicks] = await Promise.all([
    scanTable<PredictionItem>(environment.predictionsTableName),
    scanTable<StealPickItem>(environment.stealPicksTableName),
  ]);

  await Promise.all(
    stealPicks
      .filter((sp) => roboMatchIds.has(sp.matchId))
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
