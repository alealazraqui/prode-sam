import { environment } from '@/shared/config/environment';
import { deleteItem } from '@/shared/dynamo/deleteItem';
import { putItem } from '@/shared/dynamo/putItem';
import type { StealPickItem } from '@/shared/types/stealPickItem';
import type { BlockedVictimItem } from '@/shared/types/stealer';
import type { StealPickRequest } from './types';

export async function editStealPick(
  stealerUsername: string,
  request: StealPickRequest,
  existingPick: StealPickItem,
): Promise<void> {
  const victimChanged = existingPick.victimUsername !== request.victimUsername;

  if (victimChanged) {
    await deleteItem(environment.blockedVictimsTableName, {
      username: existingPick.victimUsername,
    });
    await putItem(environment.blockedVictimsTableName, {
      username: request.victimUsername,
    } satisfies BlockedVictimItem);
  }

  const updatedPick: StealPickItem = {
    calendarDate: request.calendarDate,
    stealerUsername,
    victimUsername: request.victimUsername,
    matchId: request.matchId,
    stolenPoints: existingPick.stolenPoints,
  };

  await putItem(environment.stealPicksTableName, updatedPick);
}
