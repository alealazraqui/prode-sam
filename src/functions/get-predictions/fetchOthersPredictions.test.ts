import { ScanCommand } from '@aws-sdk/lib-dynamodb';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { withTestEnv } from '@/shared/test/withTestEnv';
import type { PredictionItem } from '@/shared/types/predictionItem';

const TEST_ENV = {
  JWT_SECRET: 'test-secret',
  USERS_TABLE_NAME: 'Users',
  MATCHES_TABLE_NAME: 'Matches',
  PREDICTIONS_TABLE_NAME: 'Predictions',
};

vi.mock('@/shared/dynamo/dynamoClient', () => ({
  dynamoClient: {
    send: vi.fn(),
  },
}));

const pastKickoffItem: PredictionItem = {
  username: 'other-user',
  matchId: 'wc26-m001',
  homeGoals: 2,
  awayGoals: 1,
  updatedAt: '2026-06-05T12:00:00.000Z',
  kickoffAt: '2020-01-01T00:00:00.000Z',
  pointsCommon: 3,
};

describe('fetchOthersPredictions', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-05T15:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('sends ScanCommand filtering kickoffAt <= now and excluding auth user', async () => {
    await withTestEnv(TEST_ENV, async () => {
      vi.resetModules();
      const { dynamoClient } = await import('@/shared/dynamo/dynamoClient');
      vi.mocked(dynamoClient.send).mockImplementation(async () => ({ Items: [] }));

      const { fetchOthersPredictions } = await import('./fetchOthersPredictions');
      await fetchOthersPredictions('user1');

      expect(dynamoClient.send).toHaveBeenCalledTimes(1);
      const command = vi.mocked(dynamoClient.send).mock.calls[0]?.[0];
      expect(command).toBeInstanceOf(ScanCommand);
      expect(command?.input).toEqual({
        TableName: 'Predictions',
        FilterExpression: 'kickoffAt <= :now AND username <> :authUsername',
        ExpressionAttributeValues: {
          ':now': '2026-06-05T15:00:00.000Z',
          ':authUsername': 'user1',
        },
      });
    });
  });

  it('returns other users predictions that already passed kickoff', async () => {
    await withTestEnv(TEST_ENV, async () => {
      vi.resetModules();
      const { dynamoClient } = await import('@/shared/dynamo/dynamoClient');
      vi.mocked(dynamoClient.send).mockImplementation(async () => ({ Items: [pastKickoffItem] }));

      const { fetchOthersPredictions } = await import('./fetchOthersPredictions');
      const result = await fetchOthersPredictions('user1');

      expect(result).toEqual([pastKickoffItem]);
    });
  });

  it('returns empty array when no other predictions passed kickoff filter', async () => {
    await withTestEnv(TEST_ENV, async () => {
      vi.resetModules();
      const { dynamoClient } = await import('@/shared/dynamo/dynamoClient');
      vi.mocked(dynamoClient.send).mockImplementation(async () => ({ Items: [] }));

      const { fetchOthersPredictions } = await import('./fetchOthersPredictions');
      const result = await fetchOthersPredictions('user1');

      expect(result).toEqual([]);
    });
  });
});
