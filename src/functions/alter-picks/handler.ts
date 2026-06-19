import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import { extractAuthenticatedUsername } from '@/shared/auth/extractAuthenticatedUsername';
import { handleError } from '@/shared/errors/handleError';
import { createHttpResponse } from '@/shared/http/createHttpResponse';
import { parseJsonBody } from '@/shared/http/parseJsonBody';
import { confirmAlterPick } from './confirmAlterPick';
import { parseAlterPickBody } from './parseAlterPickBody';

export const handler = async (event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> => {
  try {
    const altererUsername = extractAuthenticatedUsername(event);
    const body = parseJsonBody<unknown>(event.body ?? null);
    const request = parseAlterPickBody(body);
    await confirmAlterPick(altererUsername, request);
    return createHttpResponse(200, { ok: true });
  } catch (error) {
    return handleError(error);
  }
};
