import type { AlterDelta, AlterSide } from '@/shared/types/alteration';

export type AlterPickRequest = {
  calendarDate: string;
  matchId: string;
  victimUsername: string;
  side: AlterSide;
  delta: AlterDelta;
};
