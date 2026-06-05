import { environment } from '@/shared/config/environment';
import { getItem } from '@/shared/dynamo/getItem';
import { UnauthorizedError } from '@/shared/errors/UnauthorizedError';
import type { UserItem } from '@/shared/types/userItem';
import { comparePassword } from './comparePassword';
import { createJwt } from './createJwt';
import type { LoginInput, LoginResponse } from './types';

const INVALID_CREDENTIALS_MESSAGE = 'Usuario o contraseña inválidos.';

export async function authenticateUser(input: LoginInput): Promise<UserItem> {
  const user = await getItem<UserItem>(environment.usersTableName, { username: input.username });

  if (!user || !comparePassword(user.password, input.password)) {
    throw new UnauthorizedError(INVALID_CREDENTIALS_MESSAGE);
  }

  return user;
}

export function buildAuthResponse(user: UserItem): LoginResponse {
  const token = createJwt({
    username: user.username,
    alias: user.alias,
  });

  return { token };
}
