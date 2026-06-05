export type SeedMatchInput = {
  matchId: string;
  homeTeamName: string;
  homeTeamCode: string;
  awayTeamName: string;
  awayTeamCode: string;
  homeGoals: null;
  awayGoals: null;
  kickoffAt: string;
  status: number;
  isFirstRound: boolean;
};

export type MatchItem = {
  matchId: string;
  homeTeamName: string;
  homeTeamCode: string | null;
  awayTeamName: string;
  awayTeamCode: string | null;
  homeGoals: number | null;
  awayGoals: number | null;
  kickoffAt: string;
  status: number;
  isFirstRound: boolean;
};
