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
  it('returns victims from the most recent steal day', () => {
    const result = resolveLatestStealVictims([
      stealPick('2026-06-01', 'old-victim', 5),
      stealPick('2026-06-05', 'latest-victim-a', 3),
      stealPick('2026-06-05', 'latest-victim-b', 2),
      stealPick('2026-06-03', 'mid-victim', 1),
    ]);

    expect(result).toEqual(['latest-victim-a', 'latest-victim-b']);
  });

  it('blocks victims from the latest day even when stolen points are still zero', () => {
    const result = resolveLatestStealVictims([
      stealPick('2026-06-04', 'old-blocked', 4),
      stealPick('2026-06-05', 'pending-victim-a', 0),
      stealPick('2026-06-05', 'pending-victim-b', 0),
    ]);

    expect(result).toEqual(['pending-victim-a', 'pending-victim-b']);
  });

  it('returns an empty list when there are no steal picks', () => {
    expect(resolveLatestStealVictims([])).toEqual([]);
  });
});
