import type { StealPickItem } from '@/shared/types/stealPickItem';

export function resolveLatestStealVictims(stealPicks: StealPickItem[]): string[] {
  if (stealPicks.length === 0) {
    return [];
  }

  const latestCalendarDate = stealPicks.reduce((latest, pick) => {
    return pick.calendarDate > latest ? pick.calendarDate : latest;
  }, stealPicks[0].calendarDate);

  const pickedVictims = new Set<string>();

  for (const pick of stealPicks) {
    if (pick.calendarDate === latestCalendarDate) {
      pickedVictims.add(pick.victimUsername);
    }
  }

  return [...pickedVictims];
}
