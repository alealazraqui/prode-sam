import { getArgentinaTodayDateString } from '@/functions/get-event-type/getArgentinaTodayDateString';
import { fetchMatchesForEventDay } from '@/functions/save-lineup-pick/fetchMatchesForEventDay';
import { environment } from '@/shared/config/environment';
import { scanTable } from '@/shared/dynamo/scanTable';
import { hasFirstKickoffPassed } from '@/shared/matches/hasFirstKickoffPassed';
import type { LineupPickItem } from '@/shared/types/lineupPickItem';

export async function fetchAllPastPicks(now: Date = new Date()): Promise<LineupPickItem[]> {
  const today = getArgentinaTodayDateString(now);
  const allPicks = await scanTable<LineupPickItem>(environment.lineupPicksTableName);
  const todayMatches = await fetchMatchesForEventDay(today);
  const includeToday = hasFirstKickoffPassed(todayMatches, now);

  return allPicks.filter((pick) => {
    if (pick.eventDay < today) {
      return true;
    }

    if (pick.eventDay === today) {
      return includeToday;
    }

    return false;
  });
}
