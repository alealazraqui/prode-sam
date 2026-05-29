import type { APIGatewayProxyEventV2 } from 'aws-lambda';
import { BadRequestError } from '@/shared/errors/BadRequestError';
import { parseJsonBody } from '@/shared/http/parseJsonBody';
import { isNonEmptyString } from '@/shared/validation/typeValidation';
import type { LoginInput } from './types';

export function parseLoginInput(event: APIGatewayProxyEventV2): LoginInput {
  const body = parseJsonBody<{ username?: unknown; password?: unknown }>(event.body ?? null);

  return {
    username: isNonEmptyString(body.username) ? body.username : '',
    password: isNonEmptyString(body.password) ? body.password : '',
  };
}

export function validateLoginInput(input: LoginInput): void {
  if (!input.username.trim() || !input.password.trim()) {
    throw new BadRequestError('username and password are required');
  }
}
