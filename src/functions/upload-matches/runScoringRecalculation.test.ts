import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { withTestEnv } from '@/shared/test/withTestEnv';
import { DayEventType } from '@/shared/types/dayEventType';
import type { AlterPickItem } from '@/shared/types/alteration';
import type { PredictionItem } from '@/shared/types/predictionItem';
import type { StealPickItem } from '@/shared/types/stealPickItem';
import type { UserItem } from '@/shared/types/userItem';
import type { UploadMatchInput } from './types';

vi.mock('@/shared/dynamo/scanTable', () => ({
  scanTable: vi.fn(),
}));

vi.mock('@/shared/dynamo/putItem', () => ({
  putItem: vi.fn(),
}));

vi.mock('@/shared/dynamo/updateItem', () => ({
  updateItem: vi.fn(),
}));

vi.mock('@/shared/dynamo/getDayType', () => ({
  getDayType: vi.fn(),
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

const ALTER_PICK: AlterPickItem = {
  altererUsername: 'alterer.user',
  victimUsername: 'victim.user',
  calendarDate: '2026-06-21',
  matchId: 'wc26-m001',
  side: 'home',
  delta: 1,
  createdAt: '2026-06-21T13:00:00.000Z',
};

const STEAL_PICK: StealPickItem = {
  calendarDate: '2026-06-21',
  stealerUsername: 'stealer.user',
  victimUsername: 'victim.user',
  matchId: 'wc26-m001',
  stolenPoints: 0,
};

const USERS: UserItem[] = [
  { username: 'victim.user', password: 'secret' },
  { username: 'stealer.user', password: 'secret' },
];

describe('runScoringRecalculation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-22T12:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('updates steal points from the altered pointsCommon recalculated earlier in the flow', async () => {
    await withTestEnv({}, async () => {
      vi.resetModules();
      let predictionsStore: PredictionItem[] = [VICTIM_PREDICTION];
      let stealPicksStore: StealPickItem[] = [STEAL_PICK];
      const { getDayType } = await import('@/shared/dynamo/getDayType');
      const { putItem } = await import('@/shared/dynamo/putItem');
      const { scanTable } = await import('@/shared/dynamo/scanTable');
      const { updateItem } = await import('@/shared/dynamo/updateItem');
      const { runScoringRecalculation } = await import('./runScoringRecalculation');

      vi.mocked(getDayType).mockResolvedValue(DayEventType.Robo);
      vi.mocked(updateItem).mockResolvedValue(undefined);
      vi.mocked(scanTable).mockImplementation(async <TItem>(tableName: string) => {
        if (tableName === 'Predictions') return predictionsStore as TItem[];
        if (tableName === 'AlterPicks') return [ALTER_PICK] as TItem[];
        if (tableName === 'StealPicks') return stealPicksStore as TItem[];
        if (tableName === 'LineupPicks') return [] as TItem[];
        if (tableName === 'Users') return USERS as TItem[];
        return [] as TItem[];
      });
      vi.mocked(putItem).mockImplementation(async (tableName, item) => {
        if (tableName === 'Predictions') {
          predictionsStore = [item as PredictionItem];
        }
        if (tableName === 'StealPicks') {
          stealPicksStore = [item as StealPickItem];
        }
      });

      await runScoringRecalculation([UPLOADED_MATCH]);

      expect(putItem).toHaveBeenCalledWith('Predictions', {
        ...VICTIM_PREDICTION,
        pointsCommon: 3,
      });
      expect(putItem).toHaveBeenCalledWith('StealPicks', {
        ...STEAL_PICK,
        stolenPoints: 3,
      });
    });
  });
});
