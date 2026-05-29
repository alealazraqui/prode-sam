import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import { createHttpResponse } from '@/shared/http/createHttpResponse';
import { handleError } from '@/shared/errors/handleError';
import { authenticateUser, buildAuthResponse } from './returnJwt';
import { parseLoginInput, validateLoginInput } from './loginValidation';

export const handler = async (event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> => {
  try {
    const input = parseLoginInput(event);
    validateLoginInput(input);
    const user = await authenticateUser(input);
    const response = buildAuthResponse(user);
    return createHttpResponse(200, response);
  } catch (error) {
    return handleError(error);
  }
};
