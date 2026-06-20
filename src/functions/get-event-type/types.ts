import type { DayEventType } from '@/shared/types/dayEventType';

export type DayEventInfo = {
  eventType: DayEventType;
};

export type StealContext = {
  currentUserIsSteal: boolean;
  blockedUsernames: string[];
  availableMatchIds: string[];
};

export type AlterContext = {
  currentUserCanAlter: boolean;
  blockedUsernames: string[];
};

export type EventTypeResponse = {
  today: string;
  days: Record<string, DayEventInfo>;
  stealContext?: StealContext;
  alterContext?: AlterContext;
};
