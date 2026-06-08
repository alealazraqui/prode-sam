import { QueryCommand, type QueryCommandInput } from '@aws-sdk/lib-dynamodb';
import { dynamoClient } from './dynamoClient';

export async function queryTable<TItem>(
  tableName: string,
  queryInput: Omit<QueryCommandInput, 'TableName'>,
): Promise<TItem[]> {
  const response = await dynamoClient.send(
    new QueryCommand({
      TableName: tableName,
      ...queryInput,
    }),
  );

  return (response.Items as TItem[] | undefined) ?? [];
}
