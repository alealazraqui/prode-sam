import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { MatchItem } from '@/functions/get-matches/types';
import { withTestEnv } from '@/shared/test/withTestEnv';

const TEST_ENV = {
  JWT_SECRET: 'test-secret',
  USERS_TABLE_NAME: 'Users',
  MATCHES_TABLE_NAME: 'Matches',
  PREDICTIONS_TABLE_NAME: 'Predictions',
};

const FUTURE_KICKOFF = '2099-01-01T12:00:00.000Z';
const PAST_KICKOFF = '2020-01-01T12:00:00.000Z';

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

vi.mock('@/shared/dynamo/getItem', () => ({
  getItem: vi.fn(),
}));

vi.mock('@/shared/dynamo/putItem', () => ({
  putItem: vi.fn(),
}));

describe('savePredictions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-06T12:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('persists each prediction with kickoffAt and without pointsCommon', async () => {
    await withTestEnv(TEST_ENV, async () => {
      vi.resetModules();
      const { getItem } = await import('@/shared/dynamo/getItem');
      const { putItem } = await import('@/shared/dynamo/putItem');
      vi.mocked(getItem).mockResolvedValue(buildMatch('wc26-m001', FUTURE_KICKOFF));
      vi.mocked(putItem).mockResolvedValue(undefined);

      const { savePredictions } = await import('./savePredictions');
      await savePredictions('user1', [{ matchId: 'wc26-m001', homeGoals: 2, awayGoals: 1 }]);

      expect(putItem).toHaveBeenCalledWith('Predictions', {
        username: 'user1',
        matchId: 'wc26-m001',
        homeGoals: 2,
        awayGoals: 1,
        updatedAt: '2026-06-06T12:00:00.000Z',
        kickoffAt: FUTURE_KICKOFF,
      });
      expect(putItem).toHaveBeenCalledOnce();
    });
  });

  it('does not persist when a match is locked', async () => {
    await withTestEnv(TEST_ENV, async () => {
      vi.resetModules();
      const { getItem } = await import('@/shared/dynamo/getItem');
      const { putItem } = await import('@/shared/dynamo/putItem');
      vi.mocked(getItem).mockResolvedValue(buildMatch('wc26-m001', PAST_KICKOFF));

      const { savePredictions } = await import('./savePredictions');

      await expect(
        savePredictions('user1', [{ matchId: 'wc26-m001', homeGoals: 2, awayGoals: 1 }]),
      ).rejects.toMatchObject({
        statusCode: 409,
        code: 'CONFLICT',
        message: 'Predictions locked for matches: wc26-m001',
      });
      expect(putItem).not.toHaveBeenCalled();
    });
  });

  it('does not persist when matchId does not exist', async () => {
    await withTestEnv(TEST_ENV, async () => {
      vi.resetModules();
      const { getItem } = await import('@/shared/dynamo/getItem');
      const { putItem } = await import('@/shared/dynamo/putItem');
      vi.mocked(getItem).mockResolvedValue(null);

      const { savePredictions } = await import('./savePredictions');

      await expect(
        savePredictions('user1', [{ matchId: 'wc26-m999', homeGoals: 1, awayGoals: 0 }]),
      ).rejects.toMatchObject({
        statusCode: 400,
        code: 'BAD_REQUEST',
        message: 'Unknown matchId: wc26-m999',
      });
      expect(putItem).not.toHaveBeenCalled();
    });
  });
});
