/** Shape of a prediction item to be seeded into the Predictions DynamoDB table. */
export type SeedPredictionItem = {
  username: string;
  matchId: string;
  homeGoals: number;
  awayGoals: number;
  updatedAt: string;
  kickoffAt: string;
  pointsCommon: number | null;
};
