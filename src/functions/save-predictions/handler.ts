import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import { extractAuthenticatedUsername } from '@/shared/auth/extractAuthenticatedUsername';
import { handleError } from '@/shared/errors/handleError';
import { parseJsonBody } from '@/shared/http/parseJsonBody';
import { savePredictions } from './savePredictions';

export const handler = async (event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> => {
  try {
    const username = extractAuthenticatedUsername(event);
    const body = parseJsonBody<unknown>(event.body ?? null);
    await savePredictions(username, body);
    return {
      statusCode: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,Authorization',
        'Access-Control-Allow-Methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
      },
    };
  } catch (error) {
    return handleError(error);
  }
};
