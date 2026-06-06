import type { MatchItem } from '@/functions/get-matches/types';
import { environment } from '@/shared/config/environment';
import { putItem } from '@/shared/dynamo/putItem';
import { scanTable } from '@/shared/dynamo/scanTable';
import { scoreCalculator } from '@/shared/scoring/scoreCalculator';
import type { ScoringMatchInput } from '@/shared/scoring/types';
import type { PredictionItem } from '@/shared/types/predictionItem';
import type { UserItem } from '@/shared/types/userItem';
import { computeRanking } from './computeRanking';
import { computeUserScores } from './computeUserScores';
import { saveMatches } from './saveMatches';
import type { UploadMatchInput } from './types';
import { updateUsers } from './updateUsers';

function buildMatchLookup(
  scannedMatches: MatchItem[],
  uploadedMatches: UploadMatchInput[],
): Map<string, ScoringMatchInput> {
  const matchLookup = new Map<string, ScoringMatchInput>();

  for (const match of scannedMatches) {
    if (match.status === 2) {
      matchLookup.set(match.matchId, {
        status: 2,
        homeGoals: match.homeGoals,
        awayGoals: match.awayGoals,
      });
    }
  }

  for (const match of uploadedMatches) {
    matchLookup.set(match.matchId, {
      status: 2,
      homeGoals: match.homeGoals,
      awayGoals: match.awayGoals,
    });
  }

  return matchLookup;
}

function groupPredictionsByUser(predictions: PredictionItem[]): Map<string, PredictionItem[]> {
  const predictionsByUser = new Map<string, PredictionItem[]>();

  for (const prediction of predictions) {
    const userPredictions = predictionsByUser.get(prediction.username) ?? [];
    userPredictions.push(prediction);
    predictionsByUser.set(prediction.username, userPredictions);
  }

  return predictionsByUser;
}

async function rewriteAffectedPredictions(
  allPredictions: PredictionItem[],
  uploadedMatches: UploadMatchInput[],
): Promise<PredictionItem[]> {
  const uploadedMatchIds = new Set(uploadedMatches.map((match) => match.matchId));
  const uploadedLookup = new Map(uploadedMatches.map((match) => [match.matchId, match]));
  const updatedPredictions = [...allPredictions];

  await Promise.all(
    updatedPredictions
      .filter((prediction) => uploadedMatchIds.has(prediction.matchId))
      .map(async (prediction) => {
        const uploadedMatch = uploadedLookup.get(prediction.matchId);
        if (!uploadedMatch) {
          return;
        }

        const scoringMatch: ScoringMatchInput = {
          status: 2,
          homeGoals: uploadedMatch.homeGoals,
          awayGoals: uploadedMatch.awayGoals,
        };
        const pointsCommon = scoreCalculator(prediction, scoringMatch).pointsCommon;
        const updatedPrediction = { ...prediction, pointsCommon };

        await putItem(environment.predictionsTableName, updatedPrediction);

        const predictionIndex = updatedPredictions.findIndex(
          (item) => item.username === prediction.username && item.matchId === prediction.matchId,
        );
        if (predictionIndex >= 0) {
          updatedPredictions[predictionIndex] = updatedPrediction;
        }
      }),
  );

  return updatedPredictions;
}

export async function runScoringRecalculation(matches: UploadMatchInput[]): Promise<void> {
  const now = new Date();
  let allPredictions = await scanTable<PredictionItem>(environment.predictionsTableName);
  const scannedMatches = await scanTable<MatchItem>(environment.matchesTableName);
  const users = await scanTable<UserItem>(environment.usersTableName);

  if (matches.length > 0) {
    await saveMatches(matches);
    allPredictions = await rewriteAffectedPredictions(allPredictions, matches);
  }

  const matchLookup = buildMatchLookup(scannedMatches, matches);
  const predictionsByUser = groupPredictionsByUser(allPredictions);

  for (const user of users) {
    if (!predictionsByUser.has(user.username)) {
      predictionsByUser.set(user.username, []);
    }
  }

  const userScores = computeUserScores(predictionsByUser, matchLookup, now);
  const ranking = computeRanking(userScores);
  await updateUsers(ranking);
}
