import type { MatchItem } from '@/functions/get-matches/types';
import { scoreCalculator } from '@/shared/scoring/scoreCalculator';
import type { AlterPickItem } from '@/shared/types/alteration';
import type { PredictionItem } from '@/shared/types/predictionItem';
import { resolveAlterPickVisibility, type AlterPickVisibility } from './alterPickVisibility';
import type {
  AlterPickPredictionGoals,
  PublicAlterPickResponse,
  MyAlterPickResponse,
} from './types';

type MapPublicAlterPickInput = {
  alterPick: AlterPickItem;
  match: MatchItem | undefined;
  victimPrediction: PredictionItem | undefined;
  now?: number;
};

function buildBaseResponse(alterPick: AlterPickItem) {
  return {
    altererUsername: alterPick.altererUsername,
    victimUsername: alterPick.victimUsername,
    calendarDate: alterPick.calendarDate,
    matchId: alterPick.matchId,
  };
}

function buildPredictionGoals(prediction: PredictionItem): AlterPickPredictionGoals {
  return {
    homeGoals: prediction.homeGoals,
    awayGoals: prediction.awayGoals,
  };
}

function applyAlteration(
  prediction: PredictionItem,
  alterPick: AlterPickItem,
): AlterPickPredictionGoals {
  const homeDelta = alterPick.side === 'home' ? alterPick.delta : 0;
  const awayDelta = alterPick.side === 'away' ? alterPick.delta : 0;

  return {
    homeGoals: Math.max(0, prediction.homeGoals + homeDelta),
    awayGoals: Math.max(0, prediction.awayGoals + awayDelta),
  };
}

function resolveFinalPoints(
  match: MatchItem | undefined,
  victimPrediction: PredictionItem,
  predictionEffective: AlterPickPredictionGoals,
): number | null {
  if (match?.status !== 2 || match.homeGoals == null || match.awayGoals == null) {
    return null;
  }

  return scoreCalculator(
    {
      ...victimPrediction,
      homeGoals: predictionEffective.homeGoals,
      awayGoals: predictionEffective.awayGoals,
    },
    {
      status: 2,
      homeGoals: match.homeGoals,
      awayGoals: match.awayGoals,
    },
  ).pointsCommon;
}

function mapRevealedWithoutDetails(alterPick: AlterPickItem): PublicAlterPickResponse {
  return buildBaseResponse(alterPick);
}

function mapRevealedWithDetails(
  alterPick: AlterPickItem,
  match: MatchItem | undefined,
  victimPrediction: PredictionItem | undefined,
): PublicAlterPickResponse | null {
  if (victimPrediction == null) {
    return null;
  }

  const predictionOriginal = buildPredictionGoals(victimPrediction);
  const predictionEffective = applyAlteration(victimPrediction, alterPick);

  return {
    ...buildBaseResponse(alterPick),
    side: alterPick.side,
    delta: alterPick.delta,
    predictionOriginal,
    predictionEffective,
    pointsCommon: resolveFinalPoints(match, victimPrediction, predictionEffective),
  };
}

function mapByVisibility(
  visibility: AlterPickVisibility,
  input: MapPublicAlterPickInput,
): PublicAlterPickResponse | null {
  if (visibility === 'hidden') {
    return null;
  }

  if (visibility === 'revealedWithoutDetails') {
    return mapRevealedWithoutDetails(input.alterPick);
  }

  return mapRevealedWithDetails(input.alterPick, input.match, input.victimPrediction);
}

export function mapAlterPickToPrivateResponse(alterPick: AlterPickItem): MyAlterPickResponse {
  return {
    ...buildBaseResponse(alterPick),
    side: alterPick.side,
    delta: alterPick.delta,
  };
}

export function mapAlterPickToPublicResponse(
  input: MapPublicAlterPickInput,
): PublicAlterPickResponse | null {
  return mapByVisibility(resolveAlterPickVisibility(input.match, input.now), input);
}
