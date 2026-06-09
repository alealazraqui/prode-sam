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
  const bottom3 = await fetchBottom3();
  await insertStealers(targetDayId, bottom3);
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
