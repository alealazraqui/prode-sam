import type {
  APIGatewayRequestAuthorizerEventV2,
  APIGatewaySimpleAuthorizerResult,
  APIGatewaySimpleAuthorizerWithContextResult,
} from 'aws-lambda';
import { verifyJwt } from '@/shared/auth/verifyJwt';

type AuthorizerContext = {
  username: string;
  alias?: string;
};

export const handler = async (
  event: APIGatewayRequestAuthorizerEventV2,
): Promise<
  APIGatewaySimpleAuthorizerResult | APIGatewaySimpleAuthorizerWithContextResult<AuthorizerContext>
> => {
  const authorizationHeader = event.headers?.authorization ?? event.headers?.Authorization;
  const token = extractBearerToken(authorizationHeader);

  if (!token) {
    return { isAuthorized: false };
  }

  try {
    const payload = verifyJwt(token);
    return {
      isAuthorized: true,
      context: {
        username: payload.username,
        ...(payload.alias ? { alias: payload.alias } : {}),
      },
    };
  } catch {
    return { isAuthorized: false };
  }
};

function extractBearerToken(header: string | undefined): string | undefined {
  if (!header) {
    return undefined;
  }

  const [scheme, token] = header.split(' ');

  if (scheme?.toLowerCase() !== 'bearer' || !token) {
    return undefined;
  }

  return token;
}
