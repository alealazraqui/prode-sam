import { environment } from '@/shared/config/environment';
import { scanTable } from '@/shared/dynamo/scanTable';
import type { PredictionItem } from '@/shared/types/predictionItem';
import type { UserItem } from '@/shared/types/userItem';

import { fetchMyPredictions } from './fetchMyPredictions';
import { fetchMyStealPick } from './fetchMyStealPick';
import { fetchOthersPredictions } from './fetchOthersPredictions';
import { fetchPastStealPicks } from './fetchPastStealPicks';
import { mapPredictionToResponse } from './mapPredictionToResponse';
import type { GetPredictionsResponse } from './types';

function buildAliasByUsername(users: UserItem[]): Map<string, string> {
  return new Map(users.map((user) => [user.username, user.alias ?? user.username]));
}

function mapItemsToResponses(items: PredictionItem[], aliasByUsername: Map<string, string>) {
  return items.map((item) =>
    mapPredictionToResponse(item, aliasByUsername.get(item.username) ?? item.username),
  );
}

export async function getPredictions(authUsername: string): Promise<GetPredictionsResponse> {
  const [myItems, othersItems, users, myStealPick, stealPicksContext] = await Promise.all([
    fetchMyPredictions(authUsername),
    fetchOthersPredictions(authUsername),
    scanTable<UserItem>(environment.usersTableName),
    fetchMyStealPick(authUsername),
    fetchPastStealPicks(),
  ]);

  const aliasByUsername = buildAliasByUsername(users);
  const myPredictions = mapItemsToResponses(myItems, aliasByUsername);
  const othersPredictions = mapItemsToResponses(othersItems, aliasByUsername);

  return {
    myPredictions,
    allPredictions: [...myPredictions, ...othersPredictions],
    myStealPick,
    allStealPicks: stealPicksContext.pastStealPicks,
    activeStealMatchIds: stealPicksContext.activeStealMatchIds,
  };
}
