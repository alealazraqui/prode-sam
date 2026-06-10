import type { MatchItem } from '@/functions/get-matches/types';

import { getEarliestKickoffAt } from './getEarliestKickoffAt';

export function hasFirstKickoffPassed(
  matches: MatchItem[],
  now: Date = new Date(),
): boolean {
  const earliestKickoffAt = getEarliestKickoffAt(matches);

  if (earliestKickoffAt === null) {
    return false;
  }

  return earliestKickoffAt <= now.toISOString();
}
