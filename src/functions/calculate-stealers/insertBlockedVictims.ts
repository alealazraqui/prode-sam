import { environment } from '@/shared/config/environment';
import { putItem } from '@/shared/dynamo/putItem';
import type { BlockedVictimItem } from '@/shared/types/stealer';

export async function insertBlockedVictims(victimUsernames: string[]): Promise<void> {
  await Promise.all(
    victimUsernames.map((username) =>
      putItem<BlockedVictimItem>(environment.blockedVictimsTableName, { username }),
    ),
  );
}
