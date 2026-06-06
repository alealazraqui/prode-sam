export type UploadMatchInput = {
  matchId: string;
  homeGoals: number;
  awayGoals: number;
  kickoffAt: string;
};

export type UserRankingEntry = {
  username: string;
  score: number;
  rankingPosition: number;
};

export type UploadMatchesEvent = {
  matches?: UploadMatchInput[];
};
