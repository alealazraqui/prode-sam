import { BadRequestError } from '../errors/BadRequestError';

export function parseJsonBody<TBody>(body: string | null): TBody {
  if (!body) {
    throw new BadRequestError('Request body is required');
  }

  try {
    return JSON.parse(body) as TBody;
  } catch {
    throw new BadRequestError('Invalid JSON body');
  }
}
