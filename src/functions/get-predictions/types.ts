import type { StealPickItem } from '@/shared/types/stealPickItem';

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
  myStealPick: StealPickItem | null;
  allStealPicks: StealPickItem[];
};
