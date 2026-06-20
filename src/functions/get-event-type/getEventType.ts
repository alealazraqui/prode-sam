import { environment } from '@/shared/config/environment';
import { getItem } from '@/shared/dynamo/getItem';
import { scanTable } from '@/shared/dynamo/scanTable';
import type { DayEventItem } from '@/shared/types/dayEvent';
import { DayEventType } from '@/shared/types/dayEventType';
import type { AlterAssignmentItem, AlterVictimLockItem } from '@/shared/types/alteration';
import type { BlockedVictimItem, StealerItem } from '@/shared/types/stealer';

import { getArgentinaTodayDateString } from './getArgentinaTodayDateString';
import type { AlterContext, EventTypeResponse, StealContext } from './types';

export async function getEventType(username: string): Promise<EventTypeResponse> {
  const today = getArgentinaTodayDateString();
  const dayEvents = await scanTable<DayEventItem>(environment.dayEventsTableName);

  const days = Object.fromEntries(
    dayEvents.map((dayEvent) => [dayEvent.date, { eventType: dayEvent.eventType }]),
  );

  const todayEventType = days[today]?.eventType;
  const [stealContext, alterContext] = await Promise.all([
    todayEventType === DayEventType.Robo ? buildStealContext(today, username) : undefined,
    buildAlterContext(today, username),
  ]);

  return {
    today,
    days,
    ...(stealContext != null ? { stealContext } : {}),
    ...(alterContext != null ? { alterContext } : {}),
  };
}

async function buildStealContext(today: string, username: string): Promise<StealContext> {
  const [stealerRow, blockedVictims] = await Promise.all([
    getItem<StealerItem>(environment.stealersTableName, {
      dayId: today,
      stealerUsername: username,
    }),
    scanTable<BlockedVictimItem>(environment.blockedVictimsTableName),
  ]);

  return {
    currentUserIsSteal: stealerRow != null,
    blockedUsernames: blockedVictims.map((item) => item.username),
    availableMatchIds: stealerRow?.availableMatchSteals ?? [],
  };
}

async function buildAlterContext(
  today: string,
  username: string,
): Promise<AlterContext | undefined> {
  const assignment = await getItem<AlterAssignmentItem>(environment.alterAssignmentsTableName, {
    calendarDate: today,
    username,
  });

  if (assignment == null) {
    return undefined;
  }

  const victimLocks = await scanTable<AlterVictimLockItem>(environment.alterVictimLocksTableName);

  return {
    currentUserCanAlter: true,
    blockedUsernames: victimLocks.map((item) => item.victimUsername),
  };
}
