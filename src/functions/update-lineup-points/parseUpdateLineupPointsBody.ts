import { BadRequestError } from '@/shared/errors/BadRequestError';
import { isNonEmptyString } from '@/shared/validation/typeValidation';
import type { UpdateLineupPickPointsInput } from './types';

const INVALID_BODY_MESSAGE =
  'Request body must be a non-empty array of { eventDay, username, points }';

export function parseUpdateLineupPointsBody(body: unknown): UpdateLineupPickPointsInput[] {
  if (!Array.isArray(body)) {
    throw new BadRequestError(INVALID_BODY_MESSAGE);
  }

  if (body.length === 0) {
    throw new BadRequestError(INVALID_BODY_MESSAGE);
  }

  return body.map((item, index) => parseItem(item, index));
}

function parseItem(value: unknown, index: number): UpdateLineupPickPointsInput {
  if (typeof value !== 'object' || value === null) {
    throw new BadRequestError(`items[${index}] must be an object`);
  }

  const record = value as Record<string, unknown>;
  const eventDay = record.eventDay;
  const username = record.username;
  const points = record.points;

  if (!isNonEmptyString(eventDay)) {
    throw new BadRequestError(`items[${index}].eventDay must be a non-empty string`);
  }

  if (!isNonEmptyString(username)) {
    throw new BadRequestError(`items[${index}].username must be a non-empty string`);
  }

  return {
    eventDay,
    username,
    points: parsePoints(points, index),
  };
}

function parsePoints(value: unknown, index: number): number {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 1 || value > 6) {
    throw new BadRequestError(`items[${index}].points must be an integer between 1 and 6`);
  }

  return value;
}
