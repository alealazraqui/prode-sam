export type SavePredictionInput = {
  matchId: string;
  homeGoals: number;
  awayGoals: number;
};

export type SavePredictionsBody = SavePredictionInput[];
