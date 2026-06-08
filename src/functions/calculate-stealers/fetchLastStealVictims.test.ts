import { describe, expect, it } from 'vitest';
import type { StealPickItem } from '@/shared/types/stealPickItem';
import { resolveLatestStealVictims } from './resolveLatestStealVictims';

function stealPick(
  calendarDate: string,
  victimUsername: string,
  stolenPoints: number,
): StealPickItem {
  return {
    calendarDate,
    stealerUsername: 'stealer',
    victimUsername,
    matchId: 'match-1',
    stolenPoints,
  };
}

describe('resolveLatestStealVictims', () => {
  it('returns victims from the most recent steal day with stolen points', () => {
    const result = resolveLatestStealVictims([
      stealPick('2026-06-01', 'old-victim', 5),
      stealPick('2026-06-05', 'latest-victim-a', 3),
      stealPick('2026-06-05', 'latest-victim-b', 2),
      stealPick('2026-06-03', 'mid-victim', 1),
    ]);

    expect(result).toEqual(['latest-victim-a', 'latest-victim-b']);
  });

  it('ignores steal picks with zero stolen points', () => {
    const result = resolveLatestStealVictims([
      stealPick('2026-06-05', 'ignored', 0),
      stealPick('2026-06-04', 'blocked', 4),
    ]);

    expect(result).toEqual(['blocked']);
  });

  it('returns an empty list when there are no successful steal picks', () => {
    expect(resolveLatestStealVictims([stealPick('2026-06-05', 'ignored', 0)])).toEqual([]);
    expect(resolveLatestStealVictims([])).toEqual([]);
  });
});
