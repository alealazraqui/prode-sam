import { beforeEach, describe, expect, it, vi } from 'vitest';
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
      });
      expect(putItem).toHaveBeenCalledWith('Stealers', {
        dayId: '2026-06-07',
        stealerUsername: 'mid',
      });
      expect(putItem).toHaveBeenCalledWith('Stealers', {
        dayId: '2026-06-07',
        stealerUsername: 'high',
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
