import type { StealPickItem } from '@/shared/types/stealPickItem';

export function resolveLatestStealVictims(stealPicks: StealPickItem[]): string[] {
  const successfulPicks = stealPicks.filter((pick) => pick.stolenPoints > 0);

  if (successfulPicks.length === 0) {
    return [];
  }

  const latestCalendarDate = successfulPicks.reduce((latest, pick) => {
    return pick.calendarDate > latest ? pick.calendarDate : latest;
  }, successfulPicks[0].calendarDate);

  return successfulPicks
    .filter((pick) => pick.calendarDate === latestCalendarDate)
    .map((pick) => pick.victimUsername);
}
