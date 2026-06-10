import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { withTestEnv } from '@/shared/test/withTestEnv';
import { DayEventType } from '@/shared/types/dayEventType';

const TEST_ENV = {
  JWT_SECRET: 'test-secret',
  USERS_TABLE_NAME: 'Users',
  MATCHES_TABLE_NAME: 'Matches',
  PREDICTIONS_TABLE_NAME: 'Predictions',
  DAY_EVENTS_TABLE_NAME: 'DayEvents',
  STEALERS_TABLE_NAME: 'Stealers',
  BLOCKED_VICTIMS_TABLE_NAME: 'BlockedVictims',
  STEAL_PICKS_TABLE_NAME: 'StealPicks',
};

vi.mock('@/shared/dynamo/getDayType', () => ({
  getDayType: vi.fn(),
}));

vi.mock('@/shared/dynamo/scanTable', () => ({
  scanTable: vi.fn(),
}));

vi.mock('@/shared/dynamo/queryTable', () => ({
  queryTable: vi.fn(),
}));

vi.mock('@/shared/dynamo/putItem', () => ({
  putItem: vi.fn(),
}));

vi.mock('@/shared/dynamo/deleteItem', () => ({
  deleteItem: vi.fn(),
}));

describe('calculate-stealers handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('rotates stealers for targetDayId and rebuilds blocked victims from latest steal day', async () => {
    await withTestEnv(TEST_ENV, async () => {
      vi.resetModules();
      const { getDayType } = await import('@/shared/dynamo/getDayType');
      const { scanTable } = await import('@/shared/dynamo/scanTable');
      const { queryTable } = await import('@/shared/dynamo/queryTable');
      const { putItem } = await import('@/shared/dynamo/putItem');
      const { deleteItem } = await import('@/shared/dynamo/deleteItem');
      const { handler } = await import('./handler');

      vi.mocked(getDayType).mockResolvedValue(DayEventType.Robo);

      vi.mocked(queryTable).mockResolvedValue([
        { dayId: '2026-06-07', stealerUsername: 'old-stealer' },
      ]);

      vi.mocked(scanTable).mockImplementation(async (tableName: string) => {
        if (tableName === 'Users') {
          return [
            { username: 'low', password: 'x', score: 1 },
            { username: 'mid', password: 'x', score: 2 },
            { username: 'high', password: 'x', score: 3 },
            { username: 'top', password: 'x', score: 100 },
          ];
        }
        if (tableName === 'BlockedVictims') {
          return [{ username: 'stale-blocked' }];
        }
        if (tableName === 'StealPicks') {
          return [
            {
              calendarDate: '2026-06-04',
              stealerUsername: 's1',
              victimUsername: 'victim-a',
              matchId: 'm1',
              stolenPoints: 5,
            },
            {
              calendarDate: '2026-06-04',
              stealerUsername: 's2',
              victimUsername: 'victim-b',
              matchId: 'm2',
              stolenPoints: 2,
            },
          ];
        }
        // Matches returns empty → availableMatchSteals will be []
        return [];
      });

      const response = await handler({ targetDayId: '2026-06-07' });

      expect(response.statusCode).toBe(200);
      expect(JSON.parse(response.body)).toEqual({
        ok: true,
        targetDayId: '2026-06-07',
        stealers: ['low', 'mid', 'high'],
        blockedVictims: ['victim-a', 'victim-b'],
      });

      expect(queryTable).toHaveBeenCalledWith('Stealers', {
        KeyConditionExpression: 'dayId = :dayId',
        ExpressionAttributeValues: { ':dayId': '2026-06-07' },
      });
      expect(deleteItem).toHaveBeenCalledWith('Stealers', {
        dayId: '2026-06-07',
        stealerUsername: 'old-stealer',
      });
      expect(deleteItem).toHaveBeenCalledWith('BlockedVictims', { username: 'stale-blocked' });

      expect(putItem).toHaveBeenCalledWith('Stealers', {
        dayId: '2026-06-07',
        stealerUsername: 'low',
        availableMatchSteals: [],
      });
      expect(putItem).toHaveBeenCalledWith('Stealers', {
        dayId: '2026-06-07',
        stealerUsername: 'mid',
        availableMatchSteals: [],
      });
      expect(putItem).toHaveBeenCalledWith('Stealers', {
        dayId: '2026-06-07',
        stealerUsername: 'high',
        availableMatchSteals: [],
      });
      expect(putItem).toHaveBeenCalledWith('BlockedVictims', { username: 'victim-a' });
      expect(putItem).toHaveBeenCalledWith('BlockedVictims', { username: 'victim-b' });
    });
  });

  it('leaves blocked victims empty when there is no successful steal history', async () => {
    await withTestEnv(TEST_ENV, async () => {
      vi.resetModules();
      const { getDayType } = await import('@/shared/dynamo/getDayType');
      const { scanTable } = await import('@/shared/dynamo/scanTable');
      const { putItem } = await import('@/shared/dynamo/putItem');
      const { handler } = await import('./handler');

      vi.mocked(getDayType).mockResolvedValue(DayEventType.Robo);

      vi.mocked(scanTable).mockImplementation(async (tableName: string) => {
        if (tableName === 'Users') {
          return [
            { username: 'a', password: 'x', score: 1 },
            { username: 'b', password: 'x', score: 2 },
            { username: 'c', password: 'x', score: 3 },
          ];
        }
        if (tableName === 'StealPicks') {
          return [
            {
              calendarDate: '2026-06-04',
              stealerUsername: 's1',
              victimUsername: 'ignored',
              matchId: 'm1',
              stolenPoints: 0,
            },
          ];
        }
        return [];
      });

      const response = await handler({ targetDayId: '2026-06-07' });
      const body = JSON.parse(response.body);

      expect(body.blockedVictims).toEqual([]);
      expect(putItem).not.toHaveBeenCalledWith('BlockedVictims', expect.anything());
    });
  });

  it('assigns each stealer a random subset of ceil(N/2) match IDs for the target day', async () => {
    await withTestEnv(TEST_ENV, async () => {
      vi.resetModules();
      const { getDayType } = await import('@/shared/dynamo/getDayType');
      const { scanTable } = await import('@/shared/dynamo/scanTable');
      const { putItem } = await import('@/shared/dynamo/putItem');
      const { handler } = await import('./handler');

      vi.mocked(getDayType).mockResolvedValue(DayEventType.Robo);

      // 4 matches on 2026-06-07 Argentina time → each stealer gets ceil(4/2) = 2
      const matchesForDay = [
        { matchId: 'wc26-m001', kickoffAt: '2026-06-07T18:00:00.000Z', status: 1, isFirstRound: true, homeTeamName: 'A', homeTeamCode: null, awayTeamName: 'B', awayTeamCode: null, homeGoals: null, awayGoals: null },
        { matchId: 'wc26-m002', kickoffAt: '2026-06-07T19:00:00.000Z', status: 1, isFirstRound: true, homeTeamName: 'C', homeTeamCode: null, awayTeamName: 'D', awayTeamCode: null, homeGoals: null, awayGoals: null },
        { matchId: 'wc26-m003', kickoffAt: '2026-06-07T21:00:00.000Z', status: 1, isFirstRound: true, homeTeamName: 'E', homeTeamCode: null, awayTeamName: 'F', awayTeamCode: null, homeGoals: null, awayGoals: null },
        { matchId: 'wc26-m004', kickoffAt: '2026-06-07T23:00:00.000Z', status: 1, isFirstRound: true, homeTeamName: 'G', homeTeamCode: null, awayTeamName: 'H', awayTeamCode: null, homeGoals: null, awayGoals: null },
        // This match belongs to the next day in Argentina → must NOT be included
        { matchId: 'wc26-m005', kickoffAt: '2026-06-08T09:00:00.000Z', status: 1, isFirstRound: true, homeTeamName: 'I', homeTeamCode: null, awayTeamName: 'J', awayTeamCode: null, homeGoals: null, awayGoals: null },
      ];

      vi.mocked(scanTable).mockImplementation(async (tableName: string) => {
        if (tableName === 'Users') {
          return [
            { username: 'stealer-a', password: 'x', score: 1 },
            { username: 'stealer-b', password: 'x', score: 2 },
            { username: 'stealer-c', password: 'x', score: 3 },
            { username: 'top', password: 'x', score: 100 },
          ];
        }
        if (tableName === 'Matches') {
          return matchesForDay;
        }
        return [];
      });

      await handler({ targetDayId: '2026-06-07' });

      const validMatchIds = ['wc26-m001', 'wc26-m002', 'wc26-m003', 'wc26-m004'];

      const stealerCalls = vi
        .mocked(putItem)
        .mock.calls.filter(([table]) => table === 'Stealers');

      expect(stealerCalls).toHaveLength(3);

      for (const [, item] of stealerCalls) {
        const available = (item as { availableMatchSteals: string[] }).availableMatchSteals;
        // Each stealer receives exactly ceil(4/2) = 2 match IDs
        expect(available).toHaveLength(2);
        // All assigned IDs belong to the target day (the 5th match must be excluded)
        for (const id of available) {
          expect(validMatchIds).toContain(id);
        }
        // No duplicates within a single stealer's list
        expect(new Set(available).size).toBe(available.length);
      }
    });
  });

  it('skips all stealer rotation when targetDayId is not a steal day', async () => {
    await withTestEnv(TEST_ENV, async () => {
      vi.resetModules();
      const { getDayType } = await import('@/shared/dynamo/getDayType');
      const { scanTable } = await import('@/shared/dynamo/scanTable');
      const { queryTable } = await import('@/shared/dynamo/queryTable');
      const { putItem } = await import('@/shared/dynamo/putItem');
      const { deleteItem } = await import('@/shared/dynamo/deleteItem');
      const { handler } = await import('./handler');

      vi.mocked(getDayType).mockResolvedValue(DayEventType.Comun);

      const response = await handler({ targetDayId: '2026-06-07' });

      expect(response.statusCode).toBe(200);
      expect(JSON.parse(response.body)).toEqual({
        ok: true,
        skipped: true,
        targetDayId: '2026-06-07',
        dayType: DayEventType.Comun,
      });
      expect(getDayType).toHaveBeenCalledWith('2026-06-07');
      expect(queryTable).not.toHaveBeenCalled();
      expect(scanTable).not.toHaveBeenCalled();
      expect(putItem).not.toHaveBeenCalled();
      expect(deleteItem).not.toHaveBeenCalled();
    });
  });
});
