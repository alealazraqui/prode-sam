import type { MatchItem } from '@/functions/get-matches/types';
import { getArgentinaTodayDateString } from '@/functions/get-event-type/getArgentinaTodayDateString';
import { environment } from '@/shared/config/environment';
import { deleteItem } from '@/shared/dynamo/deleteItem';
import { getItem } from '@/shared/dynamo/getItem';
import { BadRequestError } from '@/shared/errors/BadRequestError';
import { NotFoundError } from '@/shared/errors/NotFoundError';
import type { StealPickItem } from '@/shared/types/stealPickItem';

export async function deleteStealPick(stealerUsername: string): Promise<void> {
  const calendarDate = getArgentinaTodayDateString();

  const existingPick = await getItem<StealPickItem>(environment.stealPicksTableName, {
    calendarDate,
    stealerUsername,
  });

  if (!existingPick) {
    throw new NotFoundError('No steal pick found for today');
  }

  const match = await getItem<MatchItem>(environment.matchesTableName, {
    matchId: existingPick.matchId,
  });

  if (!match) {
    throw new BadRequestError(`Unknown matchId: ${existingPick.matchId}`);
  }

  const nowIso = new Date().toISOString();

  if (match.kickoffAt <= nowIso) {
    throw new BadRequestError(`Kickoff has passed for match ${existingPick.matchId}`);
  }

  await Promise.all([
    deleteItem(environment.stealPicksTableName, {
      calendarDate,
      stealerUsername,
    }),
    deleteItem(environment.blockedVictimsTableName, {
      username: existingPick.victimUsername,
    }),
  ]);
}
