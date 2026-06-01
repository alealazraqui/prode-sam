import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import { createHttpResponse } from '@/shared/http/createHttpResponse';
import { handleError } from '@/shared/errors/handleError';
import { extractAuthenticatedUsername } from '@/shared/auth/extractAuthenticatedUsername';
import { getCurrentUser } from './getCurrentUser';

export const handler = async (event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> => {
  try {
    const username = extractAuthenticatedUsername(event);
    const user = await getCurrentUser(username);
    return createHttpResponse(200, user);
  } catch (error) {
    return handleError(error);
  }
};
