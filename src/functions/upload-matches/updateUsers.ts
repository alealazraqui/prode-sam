import { environment } from '@/shared/config/environment';
import { updateItem } from '@/shared/dynamo/updateItem';
import type { UserRankingEntry } from './types';

export async function updateUsers(ranking: UserRankingEntry[]): Promise<void> {
  await Promise.all(
    ranking.map((entry) =>
      updateItem({
        tableName: environment.usersTableName,
        key: { username: entry.username },
        updateExpression:
          'SET score = :score, rankingPosition = :rankingPosition, rankingDif = :rankingDif',
        expressionAttributeValues: {
          ':score': entry.score,
          ':rankingPosition': entry.rankingPosition,
          ':rankingDif': entry.rankingDif,
        },
      }),
    ),
  );
}
