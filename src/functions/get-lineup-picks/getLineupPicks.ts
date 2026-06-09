import type { LineupPickItem } from '@/shared/types/lineupPickItem';

import { fetchAllPastPicks } from './fetchAllPastPicks';
import { fetchMyFuturePicks } from './fetchMyFuturePicks';
import type { GetLineupPicksResponse, LineupPickResponse } from './types';

export async function getLineupPicks(authUsername: string): Promise<GetLineupPicksResponse> {
  const [allPastItems, myFutureItems] = await Promise.all([
    fetchAllPastPicks(),
    fetchMyFuturePicks(authUsername),
  ]);

  return {
    allPastPicks: mapItemsToResponses(allPastItems),
    myFuturePicks: mapItemsToResponses(myFutureItems),
  };
}

function mapItemsToResponses(items: LineupPickItem[]): LineupPickResponse[] {
  return items.map(mapLineupPickToResponse);
}

function mapLineupPickToResponse(item: LineupPickItem): LineupPickResponse {
  return {
    eventDay: item.eventDay,
    username: item.username,
    alias: item.alias ?? item.username,
    defensor: item.defensor,
    mediocampista: item.mediocampista,
    delantero: item.delantero,
    points: item.points ?? null,
  };
}
