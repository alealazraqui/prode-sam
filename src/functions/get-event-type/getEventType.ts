import { environment } from '@/shared/config/environment';
import { getItem } from '@/shared/dynamo/getItem';
import { scanTable } from '@/shared/dynamo/scanTable';
import type { DayEventItem } from '@/shared/types/dayEvent';
import { DayEventType } from '@/shared/types/dayEventType';
import type { BlockedVictimItem, StealerItem } from '@/shared/types/stealer';

import { getArgentinaTodayDateString } from './getArgentinaTodayDateString';
import type { EventTypeResponse } from './types';

export async function getEventType(username: string): Promise<EventTypeResponse> {
  const today = getArgentinaTodayDateString();
  const dayEvents = await scanTable<DayEventItem>(environment.dayEventsTableName);

  const days = Object.fromEntries(
    dayEvents.map((dayEvent) => [dayEvent.date, { eventType: dayEvent.eventType }]),
  );

  const todayEventType = days[today]?.eventType;
  if (todayEventType !== DayEventType.Robo) {
    return { today, days };
  }

  const [stealerRow, blockedVictims] = await Promise.all([
    getItem<StealerItem>(environment.stealersTableName, {
      dayId: today,
      stealerUsername: username,
    }),
    scanTable<BlockedVictimItem>(environment.blockedVictimsTableName),
  ]);

  return {
    today,
    days,
    stealContext: {
      currentUserIsSteal: stealerRow != null,
      blockedUsernames: blockedVictims.map((item) => item.username),
    },
  };
}
