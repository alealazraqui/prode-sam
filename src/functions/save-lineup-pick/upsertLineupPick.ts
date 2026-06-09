import { environment } from '@/shared/config/environment';
import { getItem } from '@/shared/dynamo/getItem';
import { putItem } from '@/shared/dynamo/putItem';
import { NotFoundError } from '@/shared/errors/NotFoundError';
import type { LineupPickItem } from '@/shared/types/lineupPickItem';
import type { UserItem } from '@/shared/types/userItem';
import type { SaveLineupPickInput } from './types';

const USER_NOT_FOUND_MESSAGE = 'Usuario no encontrado.';

export async function upsertLineupPick(
  username: string,
  input: SaveLineupPickInput,
): Promise<void> {
  const user = await getItem<UserItem>(environment.usersTableName, { username });

  if (!user) {
    throw new NotFoundError(USER_NOT_FOUND_MESSAGE);
  }

  const item: LineupPickItem = {
    eventDay: input.eventDay,
    username,
    alias: user.alias ?? username,
    defensor: input.defensor,
    mediocampista: input.mediocampista,
    delantero: input.delantero,
    points: null,
  };

  await putItem(environment.lineupPicksTableName, item);
}
