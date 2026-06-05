import type { MatchItem, MatchResponse } from './types';

export function mapMatchItemToResponse(item: MatchItem): MatchResponse {
  return {
    matchId: item.matchId,
    homeTeam: {
      name: item.homeTeamName,
      code: item.homeTeamCode,
    },
    awayTeam: {
      name: item.awayTeamName,
      code: item.awayTeamCode,
    },
    homeGoals: item.homeGoals,
    awayGoals: item.awayGoals,
    kickoffAt: item.kickoffAt,
    status: item.status,
    isFirstRound: item.isFirstRound,
  };
}
