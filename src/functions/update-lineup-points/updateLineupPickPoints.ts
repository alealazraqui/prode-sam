import { environment } from '@/shared/config/environment';
import { updateItem } from '@/shared/dynamo/updateItem';
import { NotFoundError } from '@/shared/errors/NotFoundError';
import type { UpdateLineupPickPointsInput } from './types';

export async function updateLineupPickPoints(input: UpdateLineupPickPointsInput): Promise<void> {
  try {
    await updateItem({
      tableName: environment.lineupPicksTableName,
      key: { eventDay: input.eventDay, username: input.username },
      updateExpression: 'SET #points = :points',
      expressionAttributeNames: { '#points': 'points' },
      expressionAttributeValues: { ':points': input.points },
      conditionExpression: 'attribute_exists(eventDay) AND attribute_exists(username)',
    });
  } catch (error) {
    if (isConditionalCheckFailed(error)) {
      throw new NotFoundError(
        `Lineup pick not found for eventDay=${input.eventDay}, username=${input.username}`,
      );
    }

    throw error;
  }

  function isConditionalCheckFailed(error: unknown): boolean {
    return (
      typeof error === 'object' &&
      error !== null &&
      'name' in error &&
      error.name === 'ConditionalCheckFailedException'
    );
  }
}
