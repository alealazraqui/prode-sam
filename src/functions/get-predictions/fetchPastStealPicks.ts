import type { MatchItem } from '@/functions/get-matches/types';
import { environment } from '@/shared/config/environment';
import { scanTable } from '@/shared/dynamo/scanTable';
import type { StealPickItem } from '@/shared/types/stealPickItem';

function buildKickoffByMatchId(matches: MatchItem[]): Map<string, string> {
  return new Map(matches.map((match) => [match.matchId, match.kickoffAt]));
}

export async function fetchPastStealPicks(): Promise<StealPickItem[]> {
  const nowIso = new Date().toISOString();
  const [stealPicks, matches] = await Promise.all([
    scanTable<StealPickItem>(environment.stealPicksTableName),
    scanTable<MatchItem>(environment.matchesTableName),
  ]);

  const kickoffByMatchId = buildKickoffByMatchId(matches);

  return stealPicks.filter((stealPick) => {
    const kickoffAt = kickoffByMatchId.get(stealPick.matchId);
    return kickoffAt !== undefined && kickoffAt <= nowIso;
  });
}
