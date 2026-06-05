export type MatchStatus = 1 | 2;

export type MatchTeam = {
  name: string;
  code: string | null;
};

/** Item persistido en DynamoDB (campos planos del seed). */
export type MatchItem = {
  matchId: string;
  homeTeamName: string;
  homeTeamCode: string | null;
  awayTeamName: string;
  awayTeamCode: string | null;
  homeGoals: number | null;
  awayGoals: number | null;
  kickoffAt: string;
  status: MatchStatus;
  isFirstRound: boolean;
};

/** Contrato API camelCase (alineado con el FE). */
export type MatchResponse = {
  matchId: string;
  homeTeam: MatchTeam;
  awayTeam: MatchTeam;
  homeGoals: number | null;
  awayGoals: number | null;
  kickoffAt: string;
  status: MatchStatus;
  isFirstRound: boolean;
};
