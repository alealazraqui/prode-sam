import { describe, expect, it } from 'vitest';
import { createHttpResponse } from './createHttpResponse';
import { parseHttpResponseBody } from '@/shared/test/parseHttpResponseBody';

describe('createHttpResponse', () => {
  it('returns JSON body with status code and CORS headers', () => {
    const response = createHttpResponse(201, { message: 'ok' });

    expect(response.statusCode).toBe(201);
    expect(response.headers).toEqual({
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type,Authorization',
      'Access-Control-Allow-Methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
    });
    expect(parseHttpResponseBody(response.body)).toEqual({ message: 'ok' });
  });
});
