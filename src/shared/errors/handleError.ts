import { createHttpResponse } from '../http/createHttpResponse';
import { AppError } from './AppError';

export function handleError(error: unknown) {
  if (error instanceof AppError) {
    return createHttpResponse(error.statusCode, {
      code: error.code,
      message: error.message,
    });
  }

  console.error(error);

  return createHttpResponse(500, {
    code: 'INTERNAL_SERVER_ERROR',
    message: 'Unexpected error',
  });
}
