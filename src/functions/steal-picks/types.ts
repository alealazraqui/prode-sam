export type StealPickRequest = {
  /** Calendar date in Argentina (YYYY-MM-DD), same as DayEvents.date. */
  calendarDate: string;
  victimUsername: string;
  matchId: string;
};
