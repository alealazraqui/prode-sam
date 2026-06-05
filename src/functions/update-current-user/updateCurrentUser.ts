import { environment } from '@/shared/config/environment';
import { getItem } from '@/shared/dynamo/getItem';
import { putItem } from '@/shared/dynamo/putItem';
import { NotFoundError } from '@/shared/errors/NotFoundError';
import { mapUserItemToPublicResponse } from '@/shared/mappers/mapUserItemToPublicResponse';
import type { PublicUserResponse } from '@/shared/types/publicUserResponse';
import type { UserItem } from '@/shared/types/userItem';
import type { UpdateCurrentUserInput } from './types';

const USER_NOT_FOUND_MESSAGE = 'Usuario no encontrado.';

export async function updateCurrentUser(
  username: string,
  input: UpdateCurrentUserInput,
): Promise<PublicUserResponse> {
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

  return mapUserItemToPublicResponse(updatedUser);
}
