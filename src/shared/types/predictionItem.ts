/** Shape of a prediction row in the Predictions DynamoDB table. */
export type PredictionItem = {
  username: string;
  matchId: string;
  homeGoals: number;
  awayGoals: number;
  updatedAt: string;
  kickoffAt: string;
  pointsCommon?: number | null;
};
