import { environment } from '@/shared/config/environment';
import { scanTable } from '@/shared/dynamo/scanTable';
import type { LineupPickItem } from '@/shared/types/lineupPickItem';
import type { PredictionItem } from '@/shared/types/predictionItem';
import type { StealPickItem } from '@/shared/types/stealPickItem';
import type { UserItem } from '@/shared/types/userItem';
import { applyRankingDif } from './computeRankingDif';
import { computeRanking } from './computeRanking';
import { computeUserScores } from './computeUserScores';
import { saveMatches } from './saveMatches';
import type { UploadMatchInput } from './types';
import { updatePredictionPoints } from './updatePredictionPoints';
import { updateStealPicksStolenPoints } from './updateStealPicksStolenPoints';
import { updateUsers } from './updateUsers';

export async function runScoringRecalculation(matches: UploadMatchInput[]): Promise<void> {
  // Step 1: persist match results — future matches are skipped
  const persistedMatchIds = await saveMatches(matches);
  const persistedMatches = matches.filter((m) => persistedMatchIds.has(m.matchId));

  // Step 2: update pointsCommon for predictions of uploaded matches
  await updatePredictionPoints(persistedMatches);

  // Step 3: update stolenPoints for steal picks on robo event days
  await updateStealPicksStolenPoints(persistedMatches);

  // Step 4: recompute scores for all users from scratch
  await recalculateUserScores();
}

async function recalculateUserScores(): Promise<void> {
  const [allPredictions, allStealPicks, allLineupPicks, users] = await Promise.all([
    scanTable<PredictionItem>(environment.predictionsTableName),
    scanTable<StealPickItem>(environment.stealPicksTableName),
    scanTable<LineupPickItem>(environment.lineupPicksTableName),
    scanTable<UserItem>(environment.usersTableName),
  ]);

  const predictionsByUser = groupPredictionsByUser(allPredictions, users);
  const userScores = computeUserScores(predictionsByUser, allStealPicks, allLineupPicks);
  const previousPositions = new Map(
    users.map((user) => [user.username, user.rankingPosition ?? 0]),
  );
  const ranking = applyRankingDif(computeRanking(userScores), previousPositions);
  await updateUsers(ranking);
}

function groupPredictionsByUser(
  predictions: PredictionItem[],
  users: UserItem[],
): Map<string, PredictionItem[]> {
  const byUser = new Map<string, PredictionItem[]>();

  for (const prediction of predictions) {
    const list = byUser.get(prediction.username) ?? [];
    list.push(prediction);
    byUser.set(prediction.username, list);
  }

  for (const user of users) {
    if (!byUser.has(user.username)) {
      byUser.set(user.username, []);
    }
  }

  return byUser;
}
