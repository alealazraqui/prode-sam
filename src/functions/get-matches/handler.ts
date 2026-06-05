import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import { extractAuthenticatedUsername } from '@/shared/auth/extractAuthenticatedUsername';
import { handleError } from '@/shared/errors/handleError';
import { createHttpResponse } from '@/shared/http/createHttpResponse';
import { getMatches } from './getMatches';

export const handler = async (event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> => {
  try {
    extractAuthenticatedUsername(event);
    const matches = await getMatches();
    return createHttpResponse(200, matches);
  } catch (error) {
    return handleError(error);
  }
};
