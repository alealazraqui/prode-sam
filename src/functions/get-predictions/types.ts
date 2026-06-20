import type { StealPickItem } from '@/shared/types/stealPickItem';
import type { AlterDelta, AlterSide } from '@/shared/types/alteration';

export type PredictionResponse = {
  username: string;
  alias: string;
  matchId: string;
  homeGoals: number;
  awayGoals: number;
  updatedAt: string;
  pointsCommon: number | null;
};

export type AlterPickPredictionGoals = {
  homeGoals: number;
  awayGoals: number;
};

export type MyAlterPickResponse = {
  altererUsername: string;
  victimUsername: string;
  calendarDate: string;
  matchId: string;
  side: AlterSide;
  delta: AlterDelta;
};

export type PublicAlterPickResponse = {
  altererUsername: string;
  victimUsername: string;
  calendarDate: string;
  matchId: string;
  side?: AlterSide;
  delta?: AlterDelta;
  predictionOriginal?: AlterPickPredictionGoals;
  predictionEffective?: AlterPickPredictionGoals;
  pointsCommon?: number | null;
};

export type GetPredictionsResponse = {
  myPredictions: PredictionResponse[];
  allPredictions: PredictionResponse[];
  myStealPick: StealPickItem | null;
  allStealPicks: StealPickItem[];
  activeStealMatchIds: string[];
  myAlterPick: MyAlterPickResponse | null;
  allAlterPicks: PublicAlterPickResponse[];
};
