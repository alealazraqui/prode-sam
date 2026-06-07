import { DeleteCommand } from '@aws-sdk/lib-dynamodb';
import { dynamoClient } from './dynamoClient';

export async function deleteItem(tableName: string, key: Record<string, unknown>): Promise<void> {
  await dynamoClient.send(
    new DeleteCommand({
      TableName: tableName,
      Key: key,
    }),
  );
}
