import { describe, expect, it } from 'vitest';
import type { MatchItem } from '@/functions/get-matches/types';
import type { AlterPickItem } from '@/shared/types/alteration';
import type { PredictionItem } from '@/shared/types/predictionItem';
import {
  mapAlterPickToPublicResponse,
  mapAlterPickToPrivateResponse,
} from './mapAlterPickToResponse';

const alterPick: AlterPickItem = {
  altererUsername: 'alterer.user',
  victimUsername: 'victim.user',
  calendarDate: '2026-06-21',
  matchId: 'wc26-m001',
  side: 'home',
  delta: -1,
  createdAt: '2026-06-21T12:00:00.000Z',
};

const victimPrediction: PredictionItem = {
  username: 'victim.user',
  matchId: 'wc26-m001',
  homeGoals: 0,
  awayGoals: 1,
  updatedAt: '2026-06-21T12:30:00.000Z',
  kickoffAt: '2026-06-21T18:00:00.000Z',
};

const startedMatch: MatchItem = {
  matchId: 'wc26-m001',
  homeTeamName: 'Argentina',
  homeTeamCode: 'ARG',
  awayTeamName: 'Brasil',
  awayTeamCode: 'BRA',
  homeGoals: null,
  awayGoals: null,
  kickoffAt: '2026-06-21T18:00:00.000Z',
  status: 1,
  isFirstRound: true,
};

const finishedMatch: MatchItem = {
  ...startedMatch,
  homeGoals: 0,
  awayGoals: 1,
  status: 2,
};

describe('mapAlterPickToResponse', () => {
  it('returns the private actor summary without createdAt', () => {
    expect(mapAlterPickToPrivateResponse(alterPick)).toEqual({
      altererUsername: 'alterer.user',
      victimUsername: 'victim.user',
      calendarDate: '2026-06-21',
      matchId: 'wc26-m001',
      side: 'home',
      delta: -1,
    });
  });

  it('hides public alterations before kickoff', () => {
    const response = mapAlterPickToPublicResponse({
      alterPick,
      match: startedMatch,
      victimPrediction,
      now: new Date('2026-06-21T17:59:59.000Z').getTime(),
    });

    expect(response).toBeNull();
  });

  it('reveals only actor and victim from kickoff until the match is finalized', () => {
    const response = mapAlterPickToPublicResponse({
      alterPick,
      match: startedMatch,
      victimPrediction,
      now: new Date('2026-06-21T18:00:00.000Z').getTime(),
    });

    expect(response).toEqual({
      altererUsername: 'alterer.user',
      victimUsername: 'victim.user',
      calendarDate: '2026-06-21',
      matchId: 'wc26-m001',
    });
    expect(response).not.toHaveProperty('side');
    expect(response).not.toHaveProperty('delta');
    expect(response).not.toHaveProperty('predictionEffective');
  });

  it('reveals the effective prediction and final points when the match is finalized', () => {
    const response = mapAlterPickToPublicResponse({
      alterPick,
      match: finishedMatch,
      victimPrediction,
      now: new Date('2026-06-21T17:00:00.000Z').getTime(),
    });

    expect(response).toEqual({
      altererUsername: 'alterer.user',
      victimUsername: 'victim.user',
      calendarDate: '2026-06-21',
      matchId: 'wc26-m001',
      side: 'home',
      delta: -1,
      predictionOriginal: {
        homeGoals: 0,
        awayGoals: 1,
      },
      predictionEffective: {
        homeGoals: 0,
        awayGoals: 1,
      },
      pointsCommon: 3,
    });
  });
});
