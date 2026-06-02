import type { APIGatewayProxyEventV2 } from 'aws-lambda';
import { BadRequestError } from '@/shared/errors/BadRequestError';
import { parseJsonBody } from '@/shared/http/parseJsonBody';
import { isString } from '@/shared/validation/typeValidation';
import type { UpdateCurrentUserInput } from './types';

export function parseUpdateCurrentUserInput(
  event: APIGatewayProxyEventV2,
): UpdateCurrentUserInput {
  const body = parseJsonBody<Record<string, unknown>>(event.body ?? null);
  const input: UpdateCurrentUserInput = {};

  if ('alias' in body) {
    const alias = extractOptionalApplicableString(body.alias, 'alias');
    if (alias !== undefined) {
      input.alias = alias;
    }
  }

  if ('password' in body) {
    const password = extractOptionalApplicableString(body.password, 'password');
    if (password !== undefined) {
      input.password = password;
    }
  }

  return input;
}

function extractOptionalApplicableString(value: unknown, fieldName: string): string | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (!isString(value)) {
    throw new BadRequestError(`${fieldName} must be a string`);
  }

  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return undefined;
  }

  return trimmed;
}

const NO_APPLICABLE_FIELDS_MESSAGE = 'At least one of alias or password must be provided';

export function validateUpdateCurrentUserInput(input: UpdateCurrentUserInput): void {
  if (input.alias === undefined && input.password === undefined) {
    throw new BadRequestError(NO_APPLICABLE_FIELDS_MESSAGE);
  }
}
