import { QueryCommand } from '@aws-sdk/lib-dynamodb';
import { environment } from '@/shared/config/environment';
import { dynamoClient } from '@/shared/dynamo/dynamoClient';
import type { PredictionItem } from '@/shared/types/predictionItem';

export async function fetchMyPredictions(authUsername: string): Promise<PredictionItem[]> {
  const response = await dynamoClient.send(
    new QueryCommand({
      TableName: environment.predictionsTableName,
      KeyConditionExpression: 'username = :authUsername',
      ExpressionAttributeValues: {
        ':authUsername': authUsername,
      },
    }),
  );

  return (response.Items as PredictionItem[] | undefined) ?? [];
}
