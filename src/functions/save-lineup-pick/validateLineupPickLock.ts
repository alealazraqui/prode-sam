import { getArgentinaTodayDateString } from '@/functions/get-event-type/getArgentinaTodayDateString';
import type { MatchItem } from '@/functions/get-matches/types';
import { ConflictError } from '@/shared/errors/ConflictError';
import { hasFirstKickoffPassed } from '@/shared/matches/hasFirstKickoffPassed';

function buildLockedMessage(eventDay: string): string {
  return `Lineup picks locked for event day: ${eventDay}`;
}

export function validateLineupPickLock(
  eventDay: string,
  dayMatches: MatchItem[],
  now: Date = new Date(),
): void {
  const today = getArgentinaTodayDateString(now);

  if (eventDay < today) {
    throw new ConflictError(buildLockedMessage(eventDay));
  }

  if (eventDay > today) {
    return;
  }

  if (hasFirstKickoffPassed(dayMatches, now)) {
    throw new ConflictError(buildLockedMessage(eventDay));
  }
}
