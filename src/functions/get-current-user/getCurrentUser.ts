import { environment } from '@/shared/config/environment';
import { getItem } from '@/shared/dynamo/getItem';
import { NotFoundError } from '@/shared/errors/NotFoundError';
import type { UserItem } from '@/functions/login/types';
import type { CurrentUserResponse } from './types';

const USER_NOT_FOUND_MESSAGE = 'Usuario no encontrado.';

export async function getCurrentUser(username: string): Promise<CurrentUserResponse> {
  const user = await getItem<UserItem>(environment.usersTableName, { username });

  if (!user) {
    throw new NotFoundError(USER_NOT_FOUND_MESSAGE);
  }

  return mapUserToCurrentUserResponse(user);
}

export function mapUserToCurrentUserResponse(user: UserItem): CurrentUserResponse {
  return {
    id: user.username,
    name: user.username,
    alias: user.alias ?? user.username,
    score: user.score ?? 0,
  };
}
