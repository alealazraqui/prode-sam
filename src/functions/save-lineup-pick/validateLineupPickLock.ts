import { getArgentinaTodayDateString } from '@/functions/get-event-type/getArgentinaTodayDateString';
import type { MatchItem } from '@/functions/get-matches/types';
import { ConflictError } from '@/shared/errors/ConflictError';

function buildLockedMessage(eventDay: string): string {
  return `Lineup picks locked for event day: ${eventDay}`;
}

function getEarliestKickoffAt(matches: MatchItem[]): string | null {
  if (matches.length === 0) {
    return null;
  }

  return matches.reduce(
    (earliest, match) => (match.kickoffAt < earliest ? match.kickoffAt : earliest),
    matches[0].kickoffAt,
  );
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

  const earliestKickoffAt = getEarliestKickoffAt(dayMatches);

  if (earliestKickoffAt !== null && earliestKickoffAt <= now.toISOString()) {
    throw new ConflictError(buildLockedMessage(eventDay));
  }
}
