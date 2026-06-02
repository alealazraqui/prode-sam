import { mapUserToCurrentUserResponse } from '@/functions/get-current-user/getCurrentUser';
import type { CurrentUserResponse } from '@/functions/get-current-user/types';
import type { UserItem } from '@/functions/login/types';
import { environment } from '@/shared/config/environment';
import { getItem } from '@/shared/dynamo/getItem';
import { putItem } from '@/shared/dynamo/putItem';
import { NotFoundError } from '@/shared/errors/NotFoundError';
import type { UpdateCurrentUserInput } from './types';

const USER_NOT_FOUND_MESSAGE = 'Usuario no encontrado.';

export async function updateCurrentUser(
  username: string,
  input: UpdateCurrentUserInput,
): Promise<CurrentUserResponse> {
  const existingUser = await getItem<UserItem>(environment.usersTableName, { username });

  if (!existingUser) {
    throw new NotFoundError(USER_NOT_FOUND_MESSAGE);
  }

  const updatedUser: UserItem = {
    ...existingUser,
    ...(input.alias !== undefined ? { alias: input.alias } : {}),
    ...(input.password !== undefined ? { password: input.password } : {}),
  };

  await putItem(environment.usersTableName, updatedUser);

  return mapUserToCurrentUserResponse(updatedUser);
}
