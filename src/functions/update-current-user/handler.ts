import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import { extractAuthenticatedUsername } from '@/shared/auth/extractAuthenticatedUsername';
import { handleError } from '@/shared/errors/handleError';
import { createHttpResponse } from '@/shared/http/createHttpResponse';
import { updateCurrentUser } from './updateCurrentUser';
import {
  parseUpdateCurrentUserInput,
  validateUpdateCurrentUserInput,
} from './updateCurrentUserValidation';

export const handler = async (event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> => {
  try {
    const username = extractAuthenticatedUsername(event);
    const input = parseUpdateCurrentUserInput(event);
    validateUpdateCurrentUserInput(input);
    const user = await updateCurrentUser(username, input);
    return createHttpResponse(200, user);
  } catch (error) {
    return handleError(error);
  }
};
