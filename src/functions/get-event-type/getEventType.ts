import { environment } from '@/shared/config/environment';
import { getDayType } from '@/shared/dynamo/getDayType';
import { getItem } from '@/shared/dynamo/getItem';
import { scanTable } from '@/shared/dynamo/scanTable';
import type { BlockedVictimItem, StealerItem } from '@/shared/types/stealer';

import { getArgentinaTodayDateString } from './getArgentinaTodayDateString';
import type { EventTypeResponse } from './types';

const NON_STEAL_RESPONSE: Pick<EventTypeResponse, 'currentUserIsSteal' | 'blockedUsernames'> = {
  currentUserIsSteal: false,
  blockedUsernames: [],
};

export async function getEventType(username: string): Promise<EventTypeResponse> {
  const calendarDate = getArgentinaTodayDateString();
  const dayType = await getDayType(calendarDate);

  if (dayType !== 'robo') {
    return {
      eventType: dayType,
      ...NON_STEAL_RESPONSE,
    };
  }

  const [stealerRow, blockedVictims] = await Promise.all([
    getItem<StealerItem>(environment.stealersTableName, {
      dayId: calendarDate,
      stealerUsername: username,
    }),
    scanTable<BlockedVictimItem>(environment.blockedVictimsTableName),
  ]);

  return {
    eventType: 'steal',
    currentUserIsSteal: stealerRow != null,
    blockedUsernames: blockedVictims.map((item) => item.username),
  };
}
