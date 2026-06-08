import { environment } from '@/shared/config/environment';
import { updateItem } from '@/shared/dynamo/updateItem';
import type { UploadMatchInput } from './types';

export async function saveMatches(matches: UploadMatchInput[]): Promise<Set<string>> {
  const now = new Date();
  const pastMatches = matches.filter((m) => new Date(m.kickoffAt) <= now);

  if (pastMatches.length === 0) return new Set();

  await Promise.all(
    pastMatches.map((match) =>
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

  return new Set(pastMatches.map((m) => m.matchId));
}
