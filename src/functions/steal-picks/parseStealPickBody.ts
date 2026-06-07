import { BadRequestError } from '@/shared/errors/BadRequestError';
import { isNonEmptyString } from '@/shared/validation/typeValidation';
import type { StealPickRequest } from './types';

const INVALID_BODY_MESSAGE =
  'Request body must be an object with calendarDate, victimUsername and matchId';

export function parseStealPickBody(body: unknown): StealPickRequest {
  if (typeof body !== 'object' || body === null) {
    throw new BadRequestError(INVALID_BODY_MESSAGE);
  }

  const record = body as Record<string, unknown>;
  const calendarDate = record.calendarDate;
  const victimUsername = record.victimUsername;
  const matchId = record.matchId;

  if (!isNonEmptyString(calendarDate)) {
    throw new BadRequestError('calendarDate must be a non-empty string');
  }

  if (!isNonEmptyString(victimUsername)) {
    throw new BadRequestError('victimUsername must be a non-empty string');
  }

  if (!isNonEmptyString(matchId)) {
    throw new BadRequestError('matchId must be a non-empty string');
  }

  return { calendarDate, victimUsername, matchId };
}
