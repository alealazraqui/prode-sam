import { fetchMatchesForEventDay } from '@/functions/save-lineup-pick/fetchMatchesForEventDay';
import { getDayType } from '@/shared/dynamo/getDayType';
import { DayEventType } from '@/shared/types/dayEventType';
import { clearBlockedVictims } from './clearBlockedVictims';
import { clearStealers } from './clearStealers';
import { fetchBottom3 } from './fetchBottom3';
import { fetchLastStealVictims } from './fetchLastStealVictims';
import { insertBlockedVictims } from './insertBlockedVictims';
import { insertStealers } from './insertStealers';
import type { CalculateStealersEvent } from './types';

export async function handler(
  event: CalculateStealersEvent,
): Promise<{ statusCode: number; body: string }> {
  const targetDayId = event.targetDayId;
  const dayType = await getDayType(targetDayId);

  if (dayType !== DayEventType.Robo) {
    return {
      statusCode: 200,
      body: JSON.stringify({
        ok: true,
        skipped: true,
        targetDayId,
        dayType,
      }),
    };
  }

  await clearStealers(targetDayId);
  const [bottom3, matchesForDay] = await Promise.all([
    fetchBottom3(),
    fetchMatchesForEventDay(targetDayId),
  ]);
  const excludedMatchIds = event.excludedMatchIds ?? [];
  const eligibleMatchIds = matchesForDay
    .map((m) => m.matchId)
    .filter((id) => !excludedMatchIds.includes(id));
  await insertStealers(targetDayId, bottom3, eligibleMatchIds, event.stealsCount);
  await clearBlockedVictims();
  const victims = await fetchLastStealVictims();
  await insertBlockedVictims(victims);

  return {
    statusCode: 200,
    body: JSON.stringify({
      ok: true,
      targetDayId,
      stealers: bottom3,
      blockedVictims: victims,
    }),
  };
}
