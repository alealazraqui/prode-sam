import { TransactWriteCommand } from '@aws-sdk/lib-dynamodb';
import { environment } from '@/shared/config/environment';
import { dynamoClient } from '@/shared/dynamo/dynamoClient';
import { ConflictError } from '@/shared/errors/ConflictError';
import type { AlterPickItem, AlterVictimLockItem } from '@/shared/types/alteration';
import type { AlterPickRequest } from './types';

export async function saveAlterPick(
  altererUsername: string,
  request: AlterPickRequest,
): Promise<void> {
  const alterPick: AlterPickItem = {
    altererUsername,
    victimUsername: request.victimUsername,
    calendarDate: request.calendarDate,
    matchId: request.matchId,
    side: request.side,
    delta: request.delta,
    createdAt: new Date().toISOString(),
  };

  const victimLock: AlterVictimLockItem = {
    victimUsername: request.victimUsername,
  };

  try {
    await dynamoClient.send(
      new TransactWriteCommand({
        TransactItems: [
          {
            Put: {
              TableName: environment.alterPicksTableName,
              Item: alterPick,
              ConditionExpression: 'attribute_not_exists(altererUsername)',
            },
          },
          {
            Put: {
              TableName: environment.alterVictimLocksTableName,
              Item: victimLock,
              ConditionExpression: 'attribute_not_exists(victimUsername)',
            },
          },
        ],
      }),
    );
  } catch (error) {
    if (isAlterPickConflict(error)) {
      throw new ConflictError('Alteration cannot be confirmed');
    }

    throw error;
  }
}

function isAlterPickConflict(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'name' in error &&
    (error.name === 'ConditionalCheckFailedException' ||
      error.name === 'TransactionCanceledException')
  );
}
