/** Day event type for scoring modifiers (Regla 1 context). */
export type DayType = 'common' | 'robo' | 'players';

/** Shape of a row in the DayEvents DynamoDB table. */
export type DayEventItem = {
  date: string;
  eventType: DayType;
};
