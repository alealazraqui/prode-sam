import type { APIGatewayProxyStructuredResultV2 } from 'aws-lambda';

export function createHttpResponse(
  statusCode: number,
  body: unknown,
): APIGatewayProxyStructuredResultV2 {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type,Authorization',
      'Access-Control-Allow-Methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
    },
    body: JSON.stringify(body),
  };
}
