export type PredictionResponse = {
  username: string;
  alias: string;
  matchId: string;
  homeGoals: number;
  awayGoals: number;
  updatedAt: string;
  pointsCommon: number | null;
};

export type GetPredictionsResponse = {
  myPredictions: PredictionResponse[];
  allPredictions: PredictionResponse[];
};
