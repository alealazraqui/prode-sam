import { environment } from '@/shared/config/environment';
import { putItem } from '@/shared/dynamo/putItem';
import type { StealerItem } from '@/shared/types/stealer';
import { sampleHalfMatchIds } from './sampleHalfMatchIds';

export async function insertStealers(
  targetDayId: string,
  stealerUsernames: string[],
  eligibleMatchIds: string[],
  stealsCount?: number,
): Promise<void> {
  await Promise.all(
    stealerUsernames.map((stealerUsername) =>
      putItem<StealerItem>(environment.stealersTableName, {
        dayId: targetDayId,
        stealerUsername,
        availableMatchSteals: sampleHalfMatchIds(eligibleMatchIds, stealsCount),
      }),
    ),
  );
}
