import { BadRequestError } from '@/shared/errors/BadRequestError';
import { isNonEmptyString } from '@/shared/validation/typeValidation';
import type { SavePredictionInput } from './types';

const EMPTY_BATCH_MESSAGE = 'At least one prediction is required';
const INVALID_BATCH_MESSAGE = 'Request body must be a non-empty array of predictions';

export function parseSavePredictionsBody(body: unknown): SavePredictionInput[] {
  if (!Array.isArray(body)) {
    throw new BadRequestError(INVALID_BATCH_MESSAGE);
  }

  if (body.length === 0) {
    throw new BadRequestError(EMPTY_BATCH_MESSAGE);
  }

  return body.map((item, index) => parseSavePredictionItem(item, index));
}

function parseSavePredictionItem(item: unknown, index: number): SavePredictionInput {
  if (typeof item !== 'object' || item === null) {
    throw new BadRequestError(`predictions[${index}] must be an object`);
  }

  const record = item as Record<string, unknown>;
  const matchId = record.matchId;

  if (!isNonEmptyString(matchId)) {
    throw new BadRequestError(`predictions[${index}].matchId must be a non-empty string`);
  }

  return {
    matchId,
    homeGoals: parseNonNegativeInteger(record.homeGoals, `predictions[${index}].homeGoals`),
    awayGoals: parseNonNegativeInteger(record.awayGoals, `predictions[${index}].awayGoals`),
  };
}

function parseNonNegativeInteger(value: unknown, fieldName: string): number {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 0) {
    throw new BadRequestError(`${fieldName} must be a non-negative integer`);
  }

  return value;
}
