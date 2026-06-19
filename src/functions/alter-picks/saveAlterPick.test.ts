import { TransactWriteCommand } from '@aws-sdk/lib-dynamodb';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { withTestEnv } from '@/shared/test/withTestEnv';
import type { AlterPickRequest } from './types';

const REQUEST: AlterPickRequest = {
  calendarDate: '2026-06-21',
  matchId: 'wc26-m010',
  victimUsername: 'victim.user',
  side: 'away',
  delta: -1,
};

vi.mock('@/shared/dynamo/dynamoClient', () => ({
  dynamoClient: {
    send: vi.fn(),
  },
}));

describe('saveAlterPick', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-21T15:00:00.000Z'));
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('writes the alteration and victim lock atomically with uniqueness conditions', async () => {
    await withTestEnv({}, async () => {
      vi.resetModules();
      const { dynamoClient } = await import('@/shared/dynamo/dynamoClient');
      vi.mocked(dynamoClient.send).mockResolvedValue(undefined);

      const { saveAlterPick } = await import('./saveAlterPick');
      await saveAlterPick('alterer.user', REQUEST);

      expect(dynamoClient.send).toHaveBeenCalledTimes(1);
      const command = vi.mocked(dynamoClient.send).mock.calls[0]?.[0];
      expect(command).toBeInstanceOf(TransactWriteCommand);
      expect(command?.input).toEqual({
        TransactItems: [
          {
            Put: {
              TableName: 'AlterPicks',
              Item: {
                altererUsername: 'alterer.user',
                victimUsername: 'victim.user',
                calendarDate: '2026-06-21',
                matchId: 'wc26-m010',
                side: 'away',
                delta: -1,
                createdAt: '2026-06-21T15:00:00.000Z',
              },
              ConditionExpression: 'attribute_not_exists(altererUsername)',
            },
          },
          {
            Put: {
              TableName: 'AlterVictimLocks',
              Item: {
                victimUsername: 'victim.user',
              },
              ConditionExpression: 'attribute_not_exists(victimUsername)',
            },
          },
        ],
      });
    });
  });

  it('maps actor already used or victim blocked condition failures to ConflictError', async () => {
    await withTestEnv({}, async () => {
      vi.resetModules();
      const { dynamoClient } = await import('@/shared/dynamo/dynamoClient');
      vi.mocked(dynamoClient.send).mockRejectedValue(
        Object.assign(new Error('Conditional check failed'), {
          name: 'ConditionalCheckFailedException',
        }),
      );

      const { saveAlterPick } = await import('./saveAlterPick');

      await expect(saveAlterPick('alterer.user', REQUEST)).rejects.toMatchObject({
        statusCode: 409,
        message: 'Alteration cannot be confirmed',
      });
    });
  });

  it('maps transaction cancellations to ConflictError', async () => {
    await withTestEnv({}, async () => {
      vi.resetModules();
      const { dynamoClient } = await import('@/shared/dynamo/dynamoClient');
      vi.mocked(dynamoClient.send).mockRejectedValue(
        Object.assign(new Error('Transaction cancelled'), {
          name: 'TransactionCanceledException',
        }),
      );

      const { saveAlterPick } = await import('./saveAlterPick');

      await expect(saveAlterPick('alterer.user', REQUEST)).rejects.toMatchObject({
        statusCode: 409,
        message: 'Alteration cannot be confirmed',
      });
    });
  });
});
