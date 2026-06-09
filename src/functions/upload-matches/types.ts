export type UploadMatchInput = {
  matchId: string;
  homeGoals: number;
  awayGoals: number;
  kickoffAt: string;
};

export type ComputedRankingEntry = {
  username: string;
  score: number;
  rankingPosition: number;
};

export type UserRankingEntry = ComputedRankingEntry & {
  rankingDif: number;
};

export type UploadMatchesEvent = {
  matches?: UploadMatchInput[];
};
