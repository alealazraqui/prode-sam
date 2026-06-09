import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import { extractAuthenticatedUsername } from '@/shared/auth/extractAuthenticatedUsername';
import { handleError } from '@/shared/errors/handleError';
import { createHttpResponse } from '@/shared/http/createHttpResponse';
import { getLineupPicks } from './getLineupPicks';

export const handler = async (event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> => {
  try {
    const username = extractAuthenticatedUsername(event);
    const result = await getLineupPicks(username);
    return createHttpResponse(200, result);
  } catch (error) {
    return handleError(error);
  }
};
