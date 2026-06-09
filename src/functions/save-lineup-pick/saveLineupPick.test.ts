import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { MatchItem } from '@/functions/get-matches/types';
import { withTestEnv } from '@/shared/test/withTestEnv';

const TEST_ENV = {
  JWT_SECRET: 'test-secret',
  USERS_TABLE_NAME: 'Users',
  MATCHES_TABLE_NAME: 'Matches',
  LINEUP_PICKS_TABLE_NAME: 'LineupPicks',
};

const FUTURE_KICKOFF = '2099-01-01T12:00:00.000Z';

function buildMatch(matchId: string, kickoffAt: string): MatchItem {
  return {
    matchId,
    homeTeamName: 'Home',
    homeTeamCode: 'HOM',
    awayTeamName: 'Away',
    awayTeamCode: 'AWY',
    homeGoals: null,
    awayGoals: null,
    kickoffAt,
    status: 1,
    isFirstRound: true,
  };
}

vi.mock('@/shared/dynamo/scanTable', () => ({
  scanTable: vi.fn(),
}));

vi.mock('@/shared/dynamo/getItem', () => ({
  getItem: vi.fn(),
}));

vi.mock('@/shared/dynamo/putItem', () => ({
  putItem: vi.fn(),
}));

describe('saveLineupPick', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-06T12:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('persists a future lineup pick', async () => {
    await withTestEnv(TEST_ENV, async () => {
      vi.resetModules();
      const { scanTable } = await import('@/shared/dynamo/scanTable');
      const { getItem } = await import('@/shared/dynamo/getItem');
      const { putItem } = await import('@/shared/dynamo/putItem');
      vi.mocked(scanTable).mockResolvedValue([buildMatch('wc26-m001', FUTURE_KICKOFF)]);
      vi.mocked(getItem).mockResolvedValue({
        username: 'user1',
        alias: 'User One',
        password: 'secret',
      });
      vi.mocked(putItem).mockResolvedValue(undefined);

      const { saveLineupPick } = await import('./saveLineupPick');
      await saveLineupPick('user1', {
        eventDay: '2026-06-15',
        defensor: 'Def A',
        mediocampista: 'Mid B',
        delantero: 'Fwd C',
      });

      expect(putItem).toHaveBeenCalledWith('LineupPicks', {
        eventDay: '2026-06-15',
        username: 'user1',
        alias: 'User One',
        defensor: 'Def A',
        mediocampista: 'Mid B',
        delantero: 'Fwd C',
        points: null,
      });
    });
  });

  it('does not persist when event day is in the past', async () => {
    await withTestEnv(TEST_ENV, async () => {
      vi.resetModules();
      const { scanTable } = await import('@/shared/dynamo/scanTable');
      const { putItem } = await import('@/shared/dynamo/putItem');
      vi.mocked(scanTable).mockResolvedValue([]);

      const { saveLineupPick } = await import('./saveLineupPick');

      await expect(
        saveLineupPick('user1', {
          eventDay: '2026-06-05',
          defensor: 'Def A',
          mediocampista: 'Mid B',
          delantero: 'Fwd C',
        }),
      ).rejects.toMatchObject({
        statusCode: 409,
        code: 'CONFLICT',
        message: 'Lineup picks locked for event day: 2026-06-05',
      });
      expect(putItem).not.toHaveBeenCalled();
    });
  });

  it('does not persist when first kickoff of the day has passed', async () => {
    await withTestEnv(TEST_ENV, async () => {
      vi.resetModules();
      vi.setSystemTime(new Date('2026-06-07T15:00:00.000Z'));
      const { scanTable } = await import('@/shared/dynamo/scanTable');
      const { putItem } = await import('@/shared/dynamo/putItem');
      vi.mocked(scanTable).mockResolvedValue([buildMatch('wc26-m001', '2026-06-07T12:00:00.000Z')]);

      const { saveLineupPick } = await import('./saveLineupPick');

      await expect(
        saveLineupPick('user1', {
          eventDay: '2026-06-07',
          defensor: 'Def A',
          mediocampista: 'Mid B',
          delantero: 'Fwd C',
        }),
      ).rejects.toMatchObject({
        statusCode: 409,
        code: 'CONFLICT',
        message: 'Lineup picks locked for event day: 2026-06-07',
      });
      expect(putItem).not.toHaveBeenCalled();
    });
  });
});
