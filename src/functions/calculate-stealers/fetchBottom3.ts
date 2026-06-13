import { environment } from '@/shared/config/environment';
import { scanTable } from '@/shared/dynamo/scanTable';
import type { UserItem } from '@/shared/types/userItem';

export async function fetchBottom3(): Promise<string[]> {
  const users = await scanTable<UserItem>(environment.usersTableName);

  if (users.length === 0) {
    return [];
  }

  const sorted = [...users].sort((a, b) => (a.score ?? Infinity) - (b.score ?? Infinity));

  if (sorted.length <= 3) {
    return sorted.map((user) => user.username);
  }

  const thresholdScore = sorted[2].score;

  return sorted
    .filter((user) => user.score != null && thresholdScore != null && user.score <= thresholdScore)
    .map((user) => user.username);
}
