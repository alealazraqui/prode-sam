import { environment } from '@/shared/config/environment';
import { putItem } from '@/shared/dynamo/putItem';
import type { StealerItem } from '@/shared/types/stealer';

export async function insertStealers(
  targetDayId: string,
  stealerUsernames: string[],
): Promise<void> {
  await Promise.all(
    stealerUsernames.map((stealerUsername) =>
      putItem<StealerItem>(environment.stealersTableName, {
        dayId: targetDayId,
        stealerUsername,
      }),
    ),
  );
}
