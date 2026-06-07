import { environment } from '@/shared/config/environment';
import { getDayType } from '@/shared/dynamo/getDayType';
import { scanTable } from '@/shared/dynamo/scanTable';
import type { BlockedVictimItem, StealerItem } from '@/shared/types/stealer';
import { getArgentinaTodayDateString } from './getArgentinaTodayDateString';
import type { StealDayResponse, StealerEntry } from './types';

const EMPTY_STEAL_FIELDS: Pick<StealDayResponse, 'stealers' | 'blockedUsernames' | 'currentUserIsSteal'> = {
  stealers: [],
  blockedUsernames: [],
  currentUserIsSteal: false,
};

function mapStealerItemToEntry(item: StealerItem): StealerEntry {
  return {
    stealerUsername: item.stealerUsername,
    ...(item.matchId !== undefined ? { matchId: item.matchId } : {}),
    ...(item.victimUsername !== undefined ? { victimUsername: item.victimUsername } : {}),
  };
}

export async function getStealDay(username: string): Promise<StealDayResponse> {
  const dayId = getArgentinaTodayDateString();
  const eventType = await getDayType(dayId);

  if (eventType !== 'robo') {
    return {
      eventType,
      ...EMPTY_STEAL_FIELDS,
    };
  }

  const [allStealers, blockedVictims] = await Promise.all([
    scanTable<StealerItem>(environment.stealersTableName),
    scanTable<BlockedVictimItem>(environment.blockedVictimsTableName),
  ]);

  const stealers = allStealers.filter((item) => item.dayId === dayId).map(mapStealerItemToEntry);
  const blockedUsernames = blockedVictims.map((item) => item.username);
  const currentUserIsSteal = stealers.some((item) => item.stealerUsername === username);

  return {
    eventType: 'steal',
    stealers,
    blockedUsernames,
    currentUserIsSteal,
  };
}
