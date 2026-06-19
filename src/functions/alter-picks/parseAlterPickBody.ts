import { BadRequestError } from '@/shared/errors/BadRequestError';
import { isNonEmptyString } from '@/shared/validation/typeValidation';
import type { AlterPickRequest } from './types';

const INVALID_BODY_MESSAGE =
  'Request body must be an object with calendarDate, matchId, victimUsername, side and delta';

export function parseAlterPickBody(body: unknown): AlterPickRequest {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    throw new BadRequestError(INVALID_BODY_MESSAGE);
  }

  const record = body as Record<string, unknown>;
  const calendarDate = record.calendarDate;
  const matchId = record.matchId;
  const victimUsername = record.victimUsername;
  const side = record.side;
  const delta = record.delta;

  if (!isNonEmptyString(calendarDate)) {
    throw new BadRequestError('calendarDate must be a non-empty string');
  }

  if (!isNonEmptyString(matchId)) {
    throw new BadRequestError('matchId must be a non-empty string');
  }

  if (!isNonEmptyString(victimUsername)) {
    throw new BadRequestError('victimUsername must be a non-empty string');
  }

  if (side !== 'home' && side !== 'away') {
    throw new BadRequestError('side must be home or away');
  }

  if (delta !== 1 && delta !== -1) {
    throw new BadRequestError('delta must be 1 or -1');
  }

  return { calendarDate, matchId, victimUsername, side, delta };
}
