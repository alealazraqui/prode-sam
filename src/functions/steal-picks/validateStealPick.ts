import type { MatchItem } from '@/functions/get-matches/types';
import { environment } from '@/shared/config/environment';
import { getItem } from '@/shared/dynamo/getItem';
import { BadRequestError } from '@/shared/errors/BadRequestError';
import { ConflictError } from '@/shared/errors/ConflictError';
import type { DayEventItem } from '@/shared/types/dayEvent';
import { DayEventType } from '@/shared/types/dayEventType';
import type { BlockedVictimItem, StealerItem } from '@/shared/types/stealer';
import { getArgentinaDateStringFromIso } from './getArgentinaDateStringFromIso';
import type { StealPickRequest } from './types';

export async function validateStealPick(
  stealerUsername: string,
  request: StealPickRequest,
): Promise<void> {
  if (request.victimUsername === stealerUsername) {
    throw new BadRequestError('Cannot steal from yourself');
  }

  const stealerRow = await getItem<StealerItem>(environment.stealersTableName, {
    dayId: request.calendarDate,
    stealerUsername,
  });

  if (!stealerRow) {
    throw new BadRequestError('Caller is not an authorized stealer for this day');
  }

  if (
    stealerRow.availableMatchSteals != null &&
    stealerRow.availableMatchSteals.length > 0 &&
    !stealerRow.availableMatchSteals.includes(request.matchId)
  ) {
    throw new BadRequestError(`Match ${request.matchId} is not available for this stealer`);
  }

  const dayEvent = await getItem<DayEventItem>(environment.dayEventsTableName, {
    date: request.calendarDate,
  });

  if (dayEvent?.eventType !== DayEventType.Robo) {
    throw new BadRequestError('Steal picks are only allowed on steal days');
  }

  const blockedVictim = await getItem<BlockedVictimItem>(environment.blockedVictimsTableName, {
    username: request.victimUsername,
  });

  if (blockedVictim) {
    throw new ConflictError(`Victim is blocked: ${request.victimUsername}`);
  }

  const match = await getItem<MatchItem>(environment.matchesTableName, {
    matchId: request.matchId,
  });

  if (!match) {
    throw new BadRequestError(`Unknown matchId: ${request.matchId}`);
  }

  const matchCalendarDate = getArgentinaDateStringFromIso(match.kickoffAt);

  if (matchCalendarDate !== request.calendarDate) {
    throw new BadRequestError(
      `Match ${request.matchId} does not belong to calendar date ${request.calendarDate}`,
    );
  }

  const nowIso = new Date().toISOString();

  if (match.kickoffAt <= nowIso) {
    throw new BadRequestError(`Kickoff has passed for match ${request.matchId}`);
  }
}
