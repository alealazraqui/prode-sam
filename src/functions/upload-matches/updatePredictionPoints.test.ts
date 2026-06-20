import { beforeEach, describe, expect, it, vi } from 'vitest';
import { withTestEnv } from '@/shared/test/withTestEnv';
import type { AlterPickItem } from '@/shared/types/alteration';
import type { PredictionItem } from '@/shared/types/predictionItem';
import type { UploadMatchInput } from './types';

vi.mock('@/shared/dynamo/scanTable', () => ({
  scanTable: vi.fn(),
}));

vi.mock('@/shared/dynamo/putItem', () => ({
  putItem: vi.fn(),
}));

const UPLOADED_MATCH: UploadMatchInput = {
  matchId: 'wc26-m001',
  homeGoals: 2,
  awayGoals: 1,
  kickoffAt: '2026-06-21T18:00:00.000Z',
};

const VICTIM_PREDICTION: PredictionItem = {
  username: 'victim.user',
  matchId: 'wc26-m001',
  homeGoals: 1,
  awayGoals: 1,
  updatedAt: '2026-06-21T12:00:00.000Z',
  kickoffAt: '2026-06-21T18:00:00.000Z',
};

const OTHER_PREDICTION: PredictionItem = {
  username: 'other.user',
  matchId: 'wc26-m001',
  homeGoals: 1,
  awayGoals: 0,
  updatedAt: '2026-06-21T12:00:00.000Z',
  kickoffAt: '2026-06-21T18:00:00.000Z',
};

const ALTER_PICK: AlterPickItem = {
  altererUsername: 'alterer.user',
  victimUsername: 'victim.user',
  calendarDate: '2026-06-21',
  matchId: 'wc26-m001',
  side: 'home',
  delta: 1,
  createdAt: '2026-06-21T13:00:00.000Z',
};

function mockScans(input: {
  scanTable: <TItem>(tableName: string) => Promise<TItem[]>;
  predictions?: PredictionItem[];
  alterPicks?: AlterPickItem[];
}): void {
  vi.mocked(input.scanTable).mockImplementation(async <TItem>(tableName: string) => {
    if (tableName === 'Predictions') return (input.predictions ?? []) as TItem[];
    if (tableName === 'AlterPicks') return (input.alterPicks ?? []) as TItem[];
    return [] as TItem[];
  });
}

describe('updatePredictionPoints', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('uses the effective altered prediction to calculate victim pointsCommon', async () => {
    await withTestEnv({}, async () => {
      vi.resetModules();
      const { scanTable } = await import('@/shared/dynamo/scanTable');
      const { putItem } = await import('@/shared/dynamo/putItem');
      const { updatePredictionPoints } = await import('./updatePredictionPoints');

      mockScans({
        scanTable,
        predictions: [VICTIM_PREDICTION],
        alterPicks: [ALTER_PICK],
      });

      await updatePredictionPoints([UPLOADED_MATCH]);

      expect(scanTable).toHaveBeenCalledWith('Predictions');
      expect(scanTable).toHaveBeenCalledWith('AlterPicks');
      expect(putItem).toHaveBeenCalledWith('Predictions', {
        ...VICTIM_PREDICTION,
        pointsCommon: 3,
      });
    });
  });

  it('keeps non-victim predictions on the normal scoring path', async () => {
    await withTestEnv({}, async () => {
      vi.resetModules();
      const { scanTable } = await import('@/shared/dynamo/scanTable');
      const { putItem } = await import('@/shared/dynamo/putItem');
      const { updatePredictionPoints } = await import('./updatePredictionPoints');

      mockScans({
        scanTable,
        predictions: [OTHER_PREDICTION],
        alterPicks: [ALTER_PICK],
      });

      await updatePredictionPoints([UPLOADED_MATCH]);

      expect(putItem).toHaveBeenCalledWith('Predictions', {
        ...OTHER_PREDICTION,
        pointsCommon: 1,
      });
    });
  });

  it('does not apply an alteration from another match', async () => {
    await withTestEnv({}, async () => {
      vi.resetModules();
      const { scanTable } = await import('@/shared/dynamo/scanTable');
      const { putItem } = await import('@/shared/dynamo/putItem');
      const { updatePredictionPoints } = await import('./updatePredictionPoints');

      mockScans({
        scanTable,
        predictions: [VICTIM_PREDICTION],
        alterPicks: [{ ...ALTER_PICK, matchId: 'wc26-m999' }],
      });

      await updatePredictionPoints([UPLOADED_MATCH]);

      expect(putItem).toHaveBeenCalledWith('Predictions', {
        ...VICTIM_PREDICTION,
        pointsCommon: 0,
      });
    });
  });

  it('is idempotent on reupload because it always starts from original persisted goals', async () => {
    await withTestEnv({}, async () => {
      vi.resetModules();
      const { scanTable } = await import('@/shared/dynamo/scanTable');
      const { putItem } = await import('@/shared/dynamo/putItem');
      const { updatePredictionPoints } = await import('./updatePredictionPoints');

      mockScans({
        scanTable,
        predictions: [{ ...VICTIM_PREDICTION, pointsCommon: 1 }],
        alterPicks: [ALTER_PICK],
      });

      await updatePredictionPoints([UPLOADED_MATCH]);
      await updatePredictionPoints([UPLOADED_MATCH]);

      expect(putItem).toHaveBeenCalledTimes(2);
      expect(putItem).toHaveBeenNthCalledWith(1, 'Predictions', {
        ...VICTIM_PREDICTION,
        pointsCommon: 3,
      });
      expect(putItem).toHaveBeenNthCalledWith(2, 'Predictions', {
        ...VICTIM_PREDICTION,
        pointsCommon: 3,
      });
    });
  });

  it('preserves original persisted goals while updating only pointsCommon', async () => {
    await withTestEnv({}, async () => {
      vi.resetModules();
      const { scanTable } = await import('@/shared/dynamo/scanTable');
      const { putItem } = await import('@/shared/dynamo/putItem');
      const { updatePredictionPoints } = await import('./updatePredictionPoints');

      mockScans({
        scanTable,
        predictions: [VICTIM_PREDICTION],
        alterPicks: [ALTER_PICK],
      });

      await updatePredictionPoints([UPLOADED_MATCH]);

      expect(putItem).toHaveBeenCalledWith('Predictions', {
        username: 'victim.user',
        matchId: 'wc26-m001',
        homeGoals: 1,
        awayGoals: 1,
        updatedAt: '2026-06-21T12:00:00.000Z',
        kickoffAt: '2026-06-21T18:00:00.000Z',
        pointsCommon: 3,
      });
    });
  });

  it('skips scans and writes when no matches were persisted', async () => {
    await withTestEnv({}, async () => {
      vi.resetModules();
      const { scanTable } = await import('@/shared/dynamo/scanTable');
      const { putItem } = await import('@/shared/dynamo/putItem');
      const { updatePredictionPoints } = await import('./updatePredictionPoints');

      await updatePredictionPoints([]);

      expect(scanTable).not.toHaveBeenCalled();
      expect(putItem).not.toHaveBeenCalled();
    });
  });
});
