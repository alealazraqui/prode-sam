import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { MatchItem } from '@/functions/get-matches/types';
import { withTestEnv } from '@/shared/test/withTestEnv';
import type { StealPickItem } from '@/shared/types/stealPickItem';

const TEST_ENV = {
  JWT_SECRET: 'test-secret',
  USERS_TABLE_NAME: 'Users',
  MATCHES_TABLE_NAME: 'Matches',
  PREDICTIONS_TABLE_NAME: 'Predictions',
  DAY_EVENTS_TABLE_NAME: 'DayEvents',
  STEAL_PICKS_TABLE_NAME: 'StealPicks',
};

const finishedMatch: MatchItem = {
  matchId: 'wc26-m001',
  homeTeamName: 'Argentina',
  homeTeamCode: 'AR',
  awayTeamName: 'Brasil',
  awayTeamCode: 'BR',
  homeGoals: 2,
  awayGoals: 1,
  kickoffAt: '2020-01-01T00:00:00.000Z',
  status: 2,
  isFirstRound: true,
};

const unfinishedMatch: MatchItem = {
  ...finishedMatch,
  matchId: 'wc26-m003',
  homeGoals: null,
  awayGoals: null,
  kickoffAt: '2020-01-01T00:00:00.000Z',
  status: 1,
};

const scheduledFutureMatch: MatchItem = {
  ...unfinishedMatch,
  matchId: 'wc26-m004',
  kickoffAt: '2030-01-01T00:00:00.000Z',
};

const pastStealPick: StealPickItem = {
  calendarDate: '2026-06-05',
  stealerUsername: 'stealer.user',
  victimUsername: 'victim.user',
  matchId: 'wc26-m001',
  stolenPoints: 0,
};

const activeStealPick: StealPickItem = {
  calendarDate: '2026-06-07',
  stealerUsername: 'other.user',
  victimUsername: 'another.user',
  matchId: 'wc26-m003',
  stolenPoints: 0,
};

const futureStealPick: StealPickItem = {
  ...activeStealPick,
  matchId: 'wc26-m004',
};

vi.mock('@/shared/dynamo/scanTable', () => ({
  scanTable: vi.fn(),
}));

describe('fetchPastStealPicks', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-05T15:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('includes steal picks only for finished matches and active ids for started unfinished matches', async () => {
    await withTestEnv(TEST_ENV, async () => {
      vi.resetModules();
      const { scanTable } = await import('@/shared/dynamo/scanTable');
      vi.mocked(scanTable)
        .mockResolvedValueOnce([pastStealPick, activeStealPick, futureStealPick])
        .mockResolvedValueOnce([finishedMatch, unfinishedMatch, scheduledFutureMatch]);

      const { fetchPastStealPicks } = await import('./fetchPastStealPicks');
      const result = await fetchPastStealPicks();

      expect(scanTable).toHaveBeenNthCalledWith(1, 'StealPicks');
      expect(scanTable).toHaveBeenNthCalledWith(2, 'Matches');
      expect(result).toEqual({
        pastStealPicks: [pastStealPick, activeStealPick],
        activeStealMatchIds: ['wc26-m003'],
      });
    });
  });

  it('returns empty arrays when steal picks belong to unfinished matches that have not started', async () => {
    await withTestEnv(TEST_ENV, async () => {
      vi.resetModules();
      const { scanTable } = await import('@/shared/dynamo/scanTable');
      vi.mocked(scanTable)
        .mockResolvedValueOnce([futureStealPick])
        .mockResolvedValueOnce([scheduledFutureMatch]);

      const { fetchPastStealPicks } = await import('./fetchPastStealPicks');
      const result = await fetchPastStealPicks();

      expect(result).toEqual({
        pastStealPicks: [],
        activeStealMatchIds: [],
      });
    });
  });
});
