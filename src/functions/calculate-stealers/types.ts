export type CalculateStealersEvent = {
  targetDayId: string;
  stealsCount?: number;
  excludedMatchIds?: string[];
};
