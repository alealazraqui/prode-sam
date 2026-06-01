import type { APIGatewayProxyEventV2 } from 'aws-lambda';
import { UnauthorizedError } from '@/shared/errors/UnauthorizedError';
import { isNonEmptyString } from '@/shared/validation/typeValidation';

type AuthorizerLambdaContext = {
  username?: unknown;
};

type RequestContextWithLambdaAuthorizer = APIGatewayProxyEventV2['requestContext'] & {
  authorizer?: {
    lambda?: AuthorizerLambdaContext;
  };
};

export function extractAuthenticatedUsername(event: APIGatewayProxyEventV2): string {
  const requestContext = event.requestContext as RequestContextWithLambdaAuthorizer;
  const authorizerContext = requestContext.authorizer?.lambda;
  const username = authorizerContext?.username;

  if (!isNonEmptyString(username)) {
    throw new UnauthorizedError();
  }

  return username;
}
