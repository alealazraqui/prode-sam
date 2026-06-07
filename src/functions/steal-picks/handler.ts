import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import { extractAuthenticatedUsername } from '@/shared/auth/extractAuthenticatedUsername';
import { handleError } from '@/shared/errors/handleError';
import { createHttpResponse } from '@/shared/http/createHttpResponse';
import { parseJsonBody } from '@/shared/http/parseJsonBody';
import { parseStealPickBody } from './parseStealPickBody';
import { processStealPick } from './processStealPick';

export const handler = async (event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> => {
  try {
    const stealerUsername = extractAuthenticatedUsername(event);
    const body = parseJsonBody<unknown>(event.body ?? null);
    const request = parseStealPickBody(body);
    await processStealPick(stealerUsername, request);
    return createHttpResponse(200, { ok: true });
  } catch (error) {
    return handleError(error);
  }
};
