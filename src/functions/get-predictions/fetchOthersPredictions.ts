import { ScanCommand } from '@aws-sdk/lib-dynamodb';
import { environment } from '@/shared/config/environment';
import { dynamoClient } from '@/shared/dynamo/dynamoClient';
import type { PredictionItem } from '@/shared/types/predictionItem';

export async function fetchOthersPredictions(authUsername: string): Promise<PredictionItem[]> {
  const response = await dynamoClient.send(
    new ScanCommand({
      TableName: environment.predictionsTableName,
      FilterExpression: 'kickoffAt <= :now AND username <> :authUsername',
      ExpressionAttributeValues: {
        ':now': new Date().toISOString(),
        ':authUsername': authUsername,
      },
    }),
  );

  return (response.Items as PredictionItem[] | undefined) ?? [];
}
