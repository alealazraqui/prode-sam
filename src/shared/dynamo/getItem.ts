import { GetCommand } from '@aws-sdk/lib-dynamodb';
import { dynamoClient } from './dynamoClient';

export async function getItem<TItem>(
  tableName: string,
  key: Record<string, unknown>,
): Promise<TItem | null> {
  const response = await dynamoClient.send(
    new GetCommand({
      TableName: tableName,
      Key: key,
    }),
  );

  return (response.Item as TItem | undefined) ?? null;
}
