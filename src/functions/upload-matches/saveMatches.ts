import { environment } from '@/shared/config/environment';
import { updateItem } from '@/shared/dynamo/updateItem';
import type { UploadMatchInput } from './types';

export async function saveMatches(matches: UploadMatchInput[]): Promise<void> {
  if (matches.length === 0) {
    return;
  }

  await Promise.all(
    matches.map((match) =>
      updateItem({
        tableName: environment.matchesTableName,
        key: { matchId: match.matchId },
        updateExpression: 'SET homeGoals = :homeGoals, awayGoals = :awayGoals, #status = :status',
        expressionAttributeNames: { '#status': 'status' },
        expressionAttributeValues: {
          ':homeGoals': match.homeGoals,
          ':awayGoals': match.awayGoals,
          ':status': 2,
        },
      }),
    ),
  );
}
