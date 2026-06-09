import { BadRequestError } from '@/shared/errors/BadRequestError';
import { isNonEmptyString } from '@/shared/validation/typeValidation';
import type { SaveLineupPickInput } from './types';

const INVALID_BODY_MESSAGE =
  'Request body must be an object with eventDay, defensor, mediocampista and delantero';

export function parseSaveLineupPickBody(body: unknown): SaveLineupPickInput {
  if (typeof body !== 'object' || body === null) {
    throw new BadRequestError(INVALID_BODY_MESSAGE);
  }

  const record = body as Record<string, unknown>;
  const eventDay = record.eventDay;
  const defensor = record.defensor;
  const mediocampista = record.mediocampista;
  const delantero = record.delantero;

  if (!isNonEmptyString(eventDay)) {
    throw new BadRequestError('eventDay must be a non-empty string');
  }

  if (!isNonEmptyString(defensor)) {
    throw new BadRequestError('defensor must be a non-empty string');
  }

  if (!isNonEmptyString(mediocampista)) {
    throw new BadRequestError('mediocampista must be a non-empty string');
  }

  if (!isNonEmptyString(delantero)) {
    throw new BadRequestError('delantero must be a non-empty string');
  }

  return { eventDay, defensor, mediocampista, delantero };
}
