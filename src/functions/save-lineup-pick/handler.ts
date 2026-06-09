import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import { extractAuthenticatedUsername } from '@/shared/auth/extractAuthenticatedUsername';
import { handleError } from '@/shared/errors/handleError';
import { createHttpResponse } from '@/shared/http/createHttpResponse';
import { parseJsonBody } from '@/shared/http/parseJsonBody';
import { saveLineupPick } from './saveLineupPick';

export const handler = async (event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> => {
  try {
    const username = extractAuthenticatedUsername(event);
    const body = parseJsonBody<unknown>(event.body ?? null);
    await saveLineupPick(username, body);
    return createHttpResponse(200, {});
  } catch (error) {
    return handleError(error);
  }
};
