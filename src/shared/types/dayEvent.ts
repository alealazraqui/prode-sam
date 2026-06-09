import type { DayEventType } from './dayEventType';

/** Shape of a row in the DayEvents DynamoDB table. */
export type DayEventItem = {
  date: string;
  eventType: DayEventType;
};
