import { environment } from '@/shared/config/environment';
import { putItem } from '@/shared/dynamo/putItem';
import type { StealPickItem } from '@/shared/types/stealPickItem';
import type { BlockedVictimItem } from '@/shared/types/stealer';
import type { StealPickRequest } from './types';

export async function saveStealPick(
  stealerUsername: string,
  request: StealPickRequest,
): Promise<void> {
  const stealPick: StealPickItem = {
    calendarDate: request.calendarDate,
    stealerUsername,
    victimUsername: request.victimUsername,
    matchId: request.matchId,
    stolenPoints: 0,
  };

  await Promise.all([
    putItem(environment.stealPicksTableName, stealPick),
    putItem(environment.blockedVictimsTableName, {
      username: request.victimUsername,
    } satisfies BlockedVictimItem),
  ]);
}
