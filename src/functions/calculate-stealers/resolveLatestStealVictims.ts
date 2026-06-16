import type { StealPickItem } from '@/shared/types/stealPickItem';

export function resolveLatestStealVictims(stealPicks: StealPickItem[]): string[] {
  if (stealPicks.length === 0) {
    return [];
  }

  const latestCalendarDate = stealPicks.reduce((latest, pick) => {
    return pick.calendarDate > latest ? pick.calendarDate : latest;
  }, stealPicks[0].calendarDate);

  return [
    ...new Set(
      stealPicks
        .filter((pick) => pick.calendarDate === latestCalendarDate)
        .map((pick) => pick.victimUsername),
    ),
  ];
}
