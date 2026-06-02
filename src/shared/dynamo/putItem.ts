import { PutCommand } from '@aws-sdk/lib-dynamodb';
import { dynamoClient } from './dynamoClient';

export async function putItem<TItem extends Record<string, unknown>>(
  tableName: string,
  item: TItem,
): Promise<void> {
  await dynamoClient.send(
    new PutCommand({
      TableName: tableName,
      Item: item,
    }),
  );
}
