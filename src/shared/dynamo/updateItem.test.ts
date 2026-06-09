import { UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { dynamoClient } from './dynamoClient';
import { updateItem } from './updateItem';

vi.mock('./dynamoClient', () => ({
  dynamoClient: {
    send: vi.fn(),
  },
}));

describe('updateItem', () => {
  beforeEach(() => {
    vi.mocked(dynamoClient.send).mockReset();
    vi.mocked(dynamoClient.send).mockResolvedValue(undefined);
  });

  it('sends UpdateCommand with table, key and update expression', async () => {
    await updateItem({
      tableName: 'Predictions',
      key: { username: 'alejandro', matchId: 'wc26-m001' },
      updateExpression:
        'SET homeGoals = :homeGoals, awayGoals = :awayGoals, updatedAt = :updatedAt',
      expressionAttributeValues: {
        ':homeGoals': 2,
        ':awayGoals': 1,
        ':updatedAt': '2026-06-05T12:00:00.000Z',
      },
    });

    expect(dynamoClient.send).toHaveBeenCalledTimes(1);
    const command = vi.mocked(dynamoClient.send).mock.calls[0]?.[0];
    expect(command).toBeInstanceOf(UpdateCommand);
    expect(command?.input).toEqual({
      TableName: 'Predictions',
      Key: { username: 'alejandro', matchId: 'wc26-m001' },
      UpdateExpression:
        'SET homeGoals = :homeGoals, awayGoals = :awayGoals, updatedAt = :updatedAt',
      ExpressionAttributeValues: {
        ':homeGoals': 2,
        ':awayGoals': 1,
        ':updatedAt': '2026-06-05T12:00:00.000Z',
      },
    });
  });

  it('includes expression attribute names when provided', async () => {
    await updateItem({
      tableName: 'Predictions',
      key: { username: 'alejandro', matchId: 'wc26-m001' },
      updateExpression: 'SET #points = :points',
      expressionAttributeValues: { ':points': 3 },
      expressionAttributeNames: { '#points': 'pointsCommon' },
    });

    const command = vi.mocked(dynamoClient.send).mock.calls[0]?.[0];
    expect(command?.input).toEqual({
      TableName: 'Predictions',
      Key: { username: 'alejandro', matchId: 'wc26-m001' },
      UpdateExpression: 'SET #points = :points',
      ExpressionAttributeValues: { ':points': 3 },
      ExpressionAttributeNames: { '#points': 'pointsCommon' },
    });
  });

  it('includes condition expression when provided', async () => {
    await updateItem({
      tableName: 'LineupPicks',
      key: { eventDay: '2026-06-15', username: 'user1' },
      updateExpression: 'SET #points = :points',
      expressionAttributeValues: { ':points': 4 },
      expressionAttributeNames: { '#points': 'points' },
      conditionExpression: 'attribute_exists(eventDay) AND attribute_exists(username)',
    });

    const command = vi.mocked(dynamoClient.send).mock.calls[0]?.[0];
    expect(command?.input).toEqual({
      TableName: 'LineupPicks',
      Key: { eventDay: '2026-06-15', username: 'user1' },
      UpdateExpression: 'SET #points = :points',
      ExpressionAttributeValues: { ':points': 4 },
      ExpressionAttributeNames: { '#points': 'points' },
      ConditionExpression: 'attribute_exists(eventDay) AND attribute_exists(username)',
    });
  });
});
