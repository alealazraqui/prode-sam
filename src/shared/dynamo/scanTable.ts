import { ScanCommand } from '@aws-sdk/lib-dynamodb';
import { dynamoClient } from './dynamoClient';

export async function scanTable<TItem>(tableName: string): Promise<TItem[]> {
  const response = await dynamoClient.send(
    new ScanCommand({
      TableName: tableName,
    }),
  );

  return (response.Items as TItem[] | undefined) ?? [];
}
