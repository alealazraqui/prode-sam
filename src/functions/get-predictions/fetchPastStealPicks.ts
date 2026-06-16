import type { MatchItem } from '@/functions/get-matches/types';
import { environment } from '@/shared/config/environment';
import { scanTable } from '@/shared/dynamo/scanTable';
import type { StealPickItem } from '@/shared/types/stealPickItem';

export type StealPicksContext = {
  pastStealPicks: StealPickItem[];
  activeStealMatchIds: string[];
};

function isPostKickoff(kickoffAt: string, now: number): boolean {
  return new Date(kickoffAt).getTime() <= now;
}

export async function fetchPastStealPicks(now = Date.now()): Promise<StealPicksContext> {
  const [stealPicks, matches] = await Promise.all([
    scanTable<StealPickItem>(environment.stealPicksTableName),
    scanTable<MatchItem>(environment.matchesTableName),
  ]);

  const matchById = new Map(matches.map((match) => [match.matchId, match]));
  const pastStealPicks: StealPickItem[] = [];
  const activeStealMatchIds = new Set<string>();

  for (const stealPick of stealPicks) {
    const match = matchById.get(stealPick.matchId);
    if (match == null) continue;

    if (match.status === 2) {
      pastStealPicks.push(stealPick);
      continue;
    }

    if (isPostKickoff(match.kickoffAt, now)) {
      pastStealPicks.push(stealPick);
      activeStealMatchIds.add(stealPick.matchId);
    }
  }

  return {
    pastStealPicks,
    activeStealMatchIds: [...activeStealMatchIds],
  };
}
