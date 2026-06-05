import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import { extractAuthenticatedUsername } from '@/shared/auth/extractAuthenticatedUsername';
import { handleError } from '@/shared/errors/handleError';
import { createHttpResponse } from '@/shared/http/createHttpResponse';
import { getUsers } from './getUsers';

export const handler = async (event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> => {
  try {
    extractAuthenticatedUsername(event);
    const users = await getUsers();
    return createHttpResponse(200, users);
  } catch (error) {
    return handleError(error);
  }
};
