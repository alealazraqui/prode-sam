import { UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { dynamoClient } from './dynamoClient';

export type UpdateItemParams = {
  tableName: string;
  key: Record<string, unknown>;
  updateExpression: string;
  expressionAttributeValues: Record<string, unknown>;
  expressionAttributeNames?: Record<string, string>;
};

export async function updateItem(params: UpdateItemParams): Promise<void> {
  await dynamoClient.send(
    new UpdateCommand({
      TableName: params.tableName,
      Key: params.key,
      UpdateExpression: params.updateExpression,
      ExpressionAttributeValues: params.expressionAttributeValues,
      ...(params.expressionAttributeNames
        ? { ExpressionAttributeNames: params.expressionAttributeNames }
        : {}),
    }),
  );
}
