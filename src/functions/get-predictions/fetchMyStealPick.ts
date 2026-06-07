import { getArgentinaTodayDateString } from '@/functions/get-event-type/getArgentinaTodayDateString';
import { environment } from '@/shared/config/environment';
import { getItem } from '@/shared/dynamo/getItem';
import type { StealPickItem } from '@/shared/types/stealPickItem';

export async function fetchMyStealPick(authUsername: string): Promise<StealPickItem | null> {
  return getItem<StealPickItem>(environment.stealPicksTableName, {
    calendarDate: getArgentinaTodayDateString(),
    stealerUsername: authUsername,
  });
}
