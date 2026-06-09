import { getArgentinaTodayDateString } from '@/functions/get-event-type/getArgentinaTodayDateString';
import { environment } from '@/shared/config/environment';
import { scanTable } from '@/shared/dynamo/scanTable';
import type { LineupPickItem } from '@/shared/types/lineupPickItem';

export async function fetchAllPastPicks(): Promise<LineupPickItem[]> {
  const today = getArgentinaTodayDateString();
  const allPicks = await scanTable<LineupPickItem>(environment.lineupPicksTableName);

  return allPicks.filter((pick) => pick.eventDay < today);
}
