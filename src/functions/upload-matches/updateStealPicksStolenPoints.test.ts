import { describe, expect, it, vi } from 'vitest';
import { DayEventType } from '@/shared/types/dayEventType';
import { withTestEnv } from '@/shared/test/withTestEnv';
import type { PredictionItem } from '@/shared/types/predictionItem';
import type { StealPickItem } from '@/shared/types/stealPickItem';
import type { UploadMatchInput } from './types';

vi.mock('@/shared/dynamo/scanTable', () => ({
  scanTable: vi.fn(),
}));

vi.mock('@/shared/dynamo/putItem', () => ({
  putItem: vi.fn(),
}));

vi.mock('@/shared/dynamo/getDayType', () => ({
  getDayType: vi.fn(),
}));

const STEAL_PICK: StealPickItem = {
  calendarDate: '2026-06-08',
  stealerUsername: 'alejandro.alazraqui',
  victimUsername: 'thomas.colagiovanni',
  matchId: 'mock-today-21h',
  stolenPoints: 0,
};

const UPLOADED_MATCH: UploadMatchInput = {
  matchId: 'mock-today-21h',
  homeGoals: 1,
  awayGoals: 2,
  kickoffAt: '2026-06-09T00:00:00.000Z',
};

const VICTIM_PREDICTION: PredictionItem = {
  username: 'thomas.colagiovanni',
  matchId: 'mock-today-21h',
  homeGoals: 1,
  awayGoals: 2,
  updatedAt: '2026-06-08T12:00:00.000Z',
  kickoffAt: '2026-06-09T00:00:00.000Z',
  pointsCommon: 1,
};

describe('updateStealPicksStolenPoints', () => {
  it('does nothing when persistedMatches is empty', async () => {
    await withTestEnv({}, async () => {
      vi.resetModules();
      const { putItem } = await import('@/shared/dynamo/putItem');
      vi.mocked(putItem).mockReset();

      const { updateStealPicksStolenPoints } = await import('./updateStealPicksStolenPoints');
      await updateStealPicksStolenPoints([]);

      expect(putItem).not.toHaveBeenCalled();
    });
  });

  it('updates stolenPoints from victim pointsCommon on robo event days', async () => {
    await withTestEnv({}, async () => {
      vi.resetModules();
      const { getDayType } = await import('@/shared/dynamo/getDayType');
      const { scanTable } = await import('@/shared/dynamo/scanTable');
      const { putItem } = await import('@/shared/dynamo/putItem');
      vi.mocked(getDayType).mockResolvedValue(DayEventType.Robo);
      vi.mocked(scanTable).mockImplementation(async (tableName: string) => {
        if (tableName === 'Predictions') return [VICTIM_PREDICTION];
        if (tableName === 'StealPicks') return [STEAL_PICK];
        return [];
      });
      vi.mocked(putItem).mockReset();

      const { updateStealPicksStolenPoints } = await import('./updateStealPicksStolenPoints');
      await updateStealPicksStolenPoints([UPLOADED_MATCH]);

      expect(getDayType).toHaveBeenCalledWith('2026-06-08');
      expect(putItem).toHaveBeenCalledWith('StealPicks', { ...STEAL_PICK, stolenPoints: 1 });
    });
  });

  it('skips stolenPoints update when kickoff day is not a robo event', async () => {
    await withTestEnv({}, async () => {
      vi.resetModules();
      const { getDayType } = await import('@/shared/dynamo/getDayType');
      const { scanTable } = await import('@/shared/dynamo/scanTable');
      const { putItem } = await import('@/shared/dynamo/putItem');
      vi.mocked(getDayType).mockResolvedValue(DayEventType.Comun);
      vi.mocked(scanTable).mockImplementation(async (tableName: string) => {
        if (tableName === 'Predictions') return [VICTIM_PREDICTION];
        if (tableName === 'StealPicks') return [STEAL_PICK];
        return [];
      });
      vi.mocked(putItem).mockReset();

      const { updateStealPicksStolenPoints } = await import('./updateStealPicksStolenPoints');
      await updateStealPicksStolenPoints([UPLOADED_MATCH]);

      expect(getDayType).toHaveBeenCalledWith('2026-06-08');
      expect(putItem).not.toHaveBeenCalled();
    });
  });

  it('skips steal picks whose match is not in persistedMatches', async () => {
    await withTestEnv({}, async () => {
      vi.resetModules();
      const { getDayType } = await import('@/shared/dynamo/getDayType');
      const { scanTable } = await import('@/shared/dynamo/scanTable');
      const { putItem } = await import('@/shared/dynamo/putItem');
      vi.mocked(getDayType).mockResolvedValue(DayEventType.Robo);
      vi.mocked(scanTable).mockImplementation(async (tableName: string) => {
        if (tableName === 'Predictions') return [VICTIM_PREDICTION];
        if (tableName === 'StealPicks') return [STEAL_PICK];
        return [];
      });
      vi.mocked(putItem).mockReset();

      const { updateStealPicksStolenPoints } = await import('./updateStealPicksStolenPoints');
      await updateStealPicksStolenPoints([
        { ...UPLOADED_MATCH, matchId: 'mock-today-18h' },
      ]);

      expect(putItem).not.toHaveBeenCalled();
    });
  });

  it('sets stolenPoints to 0 when victim has no prediction for the match', async () => {
    await withTestEnv({}, async () => {
      vi.resetModules();
      const { getDayType } = await import('@/shared/dynamo/getDayType');
      const { scanTable } = await import('@/shared/dynamo/scanTable');
      const { putItem } = await import('@/shared/dynamo/putItem');
      vi.mocked(getDayType).mockResolvedValue(DayEventType.Robo);
      vi.mocked(scanTable).mockImplementation(async (tableName: string) => {
        if (tableName === 'Predictions') return [];
        if (tableName === 'StealPicks') return [STEAL_PICK];
        return [];
      });
      vi.mocked(putItem).mockReset();

      const { updateStealPicksStolenPoints } = await import('./updateStealPicksStolenPoints');
      await updateStealPicksStolenPoints([UPLOADED_MATCH]);

      expect(putItem).toHaveBeenCalledWith('StealPicks', { ...STEAL_PICK, stolenPoints: 0 });
    });
  });

  it('sets stolenPoints to 0 when victim pointsCommon is 0', async () => {
    await withTestEnv({}, async () => {
      vi.resetModules();
      const { getDayType } = await import('@/shared/dynamo/getDayType');
      const { scanTable } = await import('@/shared/dynamo/scanTable');
      const { putItem } = await import('@/shared/dynamo/putItem');
      vi.mocked(getDayType).mockResolvedValue(DayEventType.Robo);
      vi.mocked(scanTable).mockImplementation(async (tableName: string) => {
        if (tableName === 'Predictions') return [{ ...VICTIM_PREDICTION, pointsCommon: 0 }];
        if (tableName === 'StealPicks') return [STEAL_PICK];
        return [];
      });
      vi.mocked(putItem).mockReset();

      const { updateStealPicksStolenPoints } = await import('./updateStealPicksStolenPoints');
      await updateStealPicksStolenPoints([UPLOADED_MATCH]);

      expect(putItem).toHaveBeenCalledWith('StealPicks', { ...STEAL_PICK, stolenPoints: 0 });
    });
  });

  it('updates stolenPoints when victim pointsCommon changes on re-upload', async () => {
    await withTestEnv({}, async () => {
      vi.resetModules();
      const { getDayType } = await import('@/shared/dynamo/getDayType');
      const { scanTable } = await import('@/shared/dynamo/scanTable');
      const { putItem } = await import('@/shared/dynamo/putItem');
      const stealPickWithPrev = { ...STEAL_PICK, stolenPoints: 1 };
      vi.mocked(getDayType).mockResolvedValue(DayEventType.Robo);
      vi.mocked(scanTable).mockImplementation(async (tableName: string) => {
        if (tableName === 'Predictions') return [{ ...VICTIM_PREDICTION, pointsCommon: 3 }];
        if (tableName === 'StealPicks') return [stealPickWithPrev];
        return [];
      });
      vi.mocked(putItem).mockReset();

      const { updateStealPicksStolenPoints } = await import('./updateStealPicksStolenPoints');
      await updateStealPicksStolenPoints([UPLOADED_MATCH]);

      expect(putItem).toHaveBeenCalledWith('StealPicks', { ...stealPickWithPrev, stolenPoints: 3 });
    });
  });

  it('does nothing when no steal picks exist', async () => {
    await withTestEnv({}, async () => {
      vi.resetModules();
      const { getDayType } = await import('@/shared/dynamo/getDayType');
      const { scanTable } = await import('@/shared/dynamo/scanTable');
      const { putItem } = await import('@/shared/dynamo/putItem');
      vi.mocked(getDayType).mockResolvedValue(DayEventType.Robo);
      vi.mocked(scanTable).mockImplementation(async (tableName: string) => {
        if (tableName === 'Predictions') return [VICTIM_PREDICTION];
        if (tableName === 'StealPicks') return [];
        return [];
      });
      vi.mocked(putItem).mockReset();

      const { updateStealPicksStolenPoints } = await import('./updateStealPicksStolenPoints');
      await updateStealPicksStolenPoints([UPLOADED_MATCH]);

      expect(putItem).not.toHaveBeenCalled();
    });
  });
});
