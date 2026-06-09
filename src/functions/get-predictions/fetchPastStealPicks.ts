import type { MatchItem } from '@/functions/get-matches/types';
import { environment } from '@/shared/config/environment';
import { scanTable } from '@/shared/dynamo/scanTable';
import type { StealPickItem } from '@/shared/types/stealPickItem';

export async function fetchPastStealPicks(): Promise<StealPickItem[]> {
  const [stealPicks, matches] = await Promise.all([
    scanTable<StealPickItem>(environment.stealPicksTableName),
    scanTable<MatchItem>(environment.matchesTableName),
  ]);

  const matchById = new Map(matches.map((match) => [match.matchId, match]));

  return stealPicks.filter(
    (stealPick) => matchById.get(stealPick.matchId)?.status === 2,
  );
}
