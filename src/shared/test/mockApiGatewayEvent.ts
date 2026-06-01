import type { APIGatewayProxyEventV2 } from 'aws-lambda';

type MockApiGatewayEventInput = {
  body?: string | null;
  headers?: Record<string, string>;
  method?: string;
  path?: string;
  authorizerContext?: Record<string, string>;
};

export function mockApiGatewayEvent(input: MockApiGatewayEventInput = {}): APIGatewayProxyEventV2 {
  const method = input.method ?? 'POST';
  const path = input.path ?? '/';

  return {
    version: '2.0',
    routeKey: `${method} ${path}`,
    rawPath: path,
    rawQueryString: '',
    headers: input.headers ?? {},
    requestContext: {
      accountId: '123456789012',
      apiId: 'test-api',
      domainName: 'test.example.com',
      domainPrefix: 'test',
      http: {
        method,
        path,
        protocol: 'HTTP/1.1',
        sourceIp: '127.0.0.1',
        userAgent: 'vitest',
      },
      requestId: 'test-request-id',
      routeKey: `${method} ${path}`,
      stage: '$default',
      time: '01/Jan/2024:00:00:00 +0000',
      timeEpoch: 1_704_067_200_000,
      ...(input.authorizerContext
        ? {
            authorizer: {
              lambda: input.authorizerContext,
            },
          }
        : {}),
    },
    body: input.body ?? undefined,
    isBase64Encoded: false,
  };
}
