import { environment } from '@/shared/config/environment';
import { scanTable } from '@/shared/dynamo/scanTable';
import type { UserItem } from '@/shared/types/userItem';

export async function fetchBottom3(): Promise<string[]> {
  const users = await scanTable<UserItem>(environment.usersTableName);

  if (users.length === 0) {
    return [];
  }

  const sorted = [...users].sort((left, right) => {
    const leftScore = left.score;
    const rightScore = right.score;

    if (leftScore == null && rightScore == null) {
      return 0;
    }

    if (leftScore == null) {
      return 1;
    }

    if (rightScore == null) {
      return -1;
    }

    return leftScore - rightScore;
  });

  if (sorted.length <= 3) {
    return sorted.map((user) => user.username);
  }

  const thirdLowestScore = sorted[2].score;
  const definiteBottom = sorted.filter(
    (user) => user.score != null && thirdLowestScore != null && user.score < thirdLowestScore,
  );
  const borderCandidates = sorted.filter((user) => user.score === thirdLowestScore);
  const picksNeeded = 3 - definiteBottom.length;

  if (picksNeeded <= 0) {
    return definiteBottom.slice(0, 3).map((user) => user.username);
  }

  const remainingBorder = [...borderCandidates];
  const pickedBorder: UserItem[] = [];

  while (pickedBorder.length < picksNeeded && remainingBorder.length > 0) {
    const index = Math.floor(Math.random() * remainingBorder.length);
    pickedBorder.push(remainingBorder[index]);
    remainingBorder.splice(index, 1);
  }

  return [...definiteBottom, ...pickedBorder].map((user) => user.username);
}
