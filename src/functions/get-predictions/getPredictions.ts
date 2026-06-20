import { environment } from '@/shared/config/environment';
import { scanTable } from '@/shared/dynamo/scanTable';
import type { MatchItem } from '@/functions/get-matches/types';
import type { AlterPickItem } from '@/shared/types/alteration';
import type { PredictionItem } from '@/shared/types/predictionItem';
import type { UserItem } from '@/shared/types/userItem';

import { fetchMyPredictions } from './fetchMyPredictions';
import { fetchMyStealPick } from './fetchMyStealPick';
import { fetchOthersPredictions } from './fetchOthersPredictions';
import { fetchPastStealPicks } from './fetchPastStealPicks';
import {
  mapAlterPickToPrivateResponse,
  mapAlterPickToPublicResponse,
} from './mapAlterPickToResponse';
import { mapPredictionToResponse } from './mapPredictionToResponse';
import type { GetPredictionsResponse, PublicAlterPickResponse } from './types';

function buildAliasByUsername(users: UserItem[]): Map<string, string> {
  return new Map(users.map((user) => [user.username, user.alias ?? user.username]));
}

function mapItemsToResponses(items: PredictionItem[], aliasByUsername: Map<string, string>) {
  return items.map((item) =>
    mapPredictionToResponse(item, aliasByUsername.get(item.username) ?? item.username),
  );
}

function buildMatchById(matches: MatchItem[]): Map<string, MatchItem> {
  return new Map(matches.map((match) => [match.matchId, match]));
}

function buildPredictionByUserAndMatch(predictions: PredictionItem[]): Map<string, PredictionItem> {
  return new Map(
    predictions.map((prediction) => [`${prediction.username}:${prediction.matchId}`, prediction]),
  );
}

function getPredictionLookupKey(username: string, matchId: string): string {
  return `${username}:${matchId}`;
}

function mapPublicAlterPicks(
  alterPicks: AlterPickItem[],
  matches: MatchItem[],
  predictions: PredictionItem[],
): PublicAlterPickResponse[] {
  const matchById = buildMatchById(matches);
  const predictionByUserAndMatch = buildPredictionByUserAndMatch(predictions);

  return alterPicks
    .map((alterPick) =>
      mapAlterPickToPublicResponse({
        alterPick,
        match: matchById.get(alterPick.matchId),
        victimPrediction: predictionByUserAndMatch.get(
          getPredictionLookupKey(alterPick.victimUsername, alterPick.matchId),
        ),
      }),
    )
    .filter((alterPick): alterPick is PublicAlterPickResponse => alterPick != null);
}

export async function getPredictions(authUsername: string): Promise<GetPredictionsResponse> {
  const [myItems, othersItems, users, myStealPick, stealPicksContext, alterPicks, matches] =
    await Promise.all([
      fetchMyPredictions(authUsername),
      fetchOthersPredictions(authUsername),
      scanTable<UserItem>(environment.usersTableName),
      fetchMyStealPick(authUsername),
      fetchPastStealPicks(),
      scanTable<AlterPickItem>(environment.alterPicksTableName),
      scanTable<MatchItem>(environment.matchesTableName),
    ]);

  const aliasByUsername = buildAliasByUsername(users);
  const myPredictions = mapItemsToResponses(myItems, aliasByUsername);
  const othersPredictions = mapItemsToResponses(othersItems, aliasByUsername);
  const visiblePredictionItems = [...myItems, ...othersItems];
  const myAlterPick = alterPicks.find((alterPick) => alterPick.altererUsername === authUsername);

  return {
    myPredictions,
    allPredictions: [...myPredictions, ...othersPredictions],
    myStealPick,
    allStealPicks: stealPicksContext.pastStealPicks,
    activeStealMatchIds: stealPicksContext.activeStealMatchIds,
    myAlterPick: myAlterPick != null ? mapAlterPickToPrivateResponse(myAlterPick) : null,
    allAlterPicks: mapPublicAlterPicks(alterPicks, matches, visiblePredictionItems),
  };
}
