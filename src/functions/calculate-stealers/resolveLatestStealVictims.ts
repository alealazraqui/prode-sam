import type { StealPickItem } from '@/shared/types/stealPickItem';

export function resolveLatestStealVictims(stealPicks: StealPickItem[]): string[] {
  if (stealPicks.length === 0) {
    return [];
  }

  const latestCalendarDate = stealPicks.reduce((latest, pick) => {
    return pick.calendarDate > latest ? pick.calendarDate : latest;
  }, stealPicks[0].calendarDate);

  const victimsWithStolenPoints = new Set<string>();

  for (const pick of stealPicks) {
    if (pick.calendarDate === latestCalendarDate && pick.stolenPoints > 0) {
      victimsWithStolenPoints.add(pick.victimUsername);
    }
  }

  return [...victimsWithStolenPoints];
}
