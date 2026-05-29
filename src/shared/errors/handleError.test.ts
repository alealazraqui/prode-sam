import { describe, expect, it, vi } from 'vitest';
import { BadRequestError } from './BadRequestError';
import { UnauthorizedError } from './UnauthorizedError';
import { handleError } from './handleError';
import { parseHttpResponseBody } from '@/shared/test/parseHttpResponseBody';

describe('handleError', () => {
  it('maps AppError to HTTP response with status, code and message', () => {
    const response = handleError(new BadRequestError('Invalid input'));

    expect(response.statusCode).toBe(400);
    expect(parseHttpResponseBody(response.body)).toEqual({
      code: 'BAD_REQUEST',
      message: 'Invalid input',
    });
  });

  it('maps UnauthorizedError to 401', () => {
    const response = handleError(new UnauthorizedError('Usuario o contraseña inválidos.'));

    expect(response.statusCode).toBe(401);
    expect(parseHttpResponseBody(response.body)).toEqual({
      code: 'UNAUTHORIZED',
      message: 'Usuario o contraseña inválidos.',
    });
  });

  it('returns 500 for unexpected errors', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    const response = handleError(new Error('boom'));

    expect(response.statusCode).toBe(500);
    expect(parseHttpResponseBody(response.body)).toEqual({
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Unexpected error',
    });
    expect(consoleError).toHaveBeenCalledOnce();

    consoleError.mockRestore();
  });
});
