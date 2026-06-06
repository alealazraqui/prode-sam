/** Match fields required for scoring calculations. */
export type ScoringMatchInput = {
  status: 1 | 2;
  homeGoals: number | null;
  awayGoals: number | null;
};

/** Points awarded per scoring rule. */
export type PredictionScore = {
  pointsCommon: number;
};
