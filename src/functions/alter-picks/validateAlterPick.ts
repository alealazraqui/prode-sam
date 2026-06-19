import type { MatchItem } from '@/functions/get-matches/types';
import { environment } from '@/shared/config/environment';
import {
  getArgentinaDateStringFromIso,
  getArgentinaTodayDateString,
} from '@/shared/dates/argentinaDate';
import { getItem } from '@/shared/dynamo/getItem';
import { BadRequestError } from '@/shared/errors/BadRequestError';
import type { AlterAssignmentItem } from '@/shared/types/alteration';
import type { AlterPickRequest } from './types';

export async function validateAlterPick(
  altererUsername: string,
  request: AlterPickRequest,
): Promise<void> {
  validateVictimIsNotCaller(altererUsername, request);
  validateRequestDateIsToday(request);
  await validateCallerAssignment(altererUsername, request);
  const match = await getRequestedMatch(request);
  validateMatchCalendarDate(match, request);
  validateMatchCanBeAltered(match, request);
}

function validateVictimIsNotCaller(altererUsername: string, request: AlterPickRequest): void {
  if (request.victimUsername === altererUsername) {
    throw new BadRequestError('Cannot alter yourself');
  }
}

function validateRequestDateIsToday(request: AlterPickRequest): void {
  const today = getArgentinaTodayDateString();

  if (request.calendarDate !== today) {
    throw new BadRequestError('Alterations are only allowed for today');
  }
}

async function validateCallerAssignment(
  altererUsername: string,
  request: AlterPickRequest,
): Promise<void> {
  const assignment = await getItem<AlterAssignmentItem>(environment.alterAssignmentsTableName, {
    calendarDate: request.calendarDate,
    username: altererUsername,
  });

  if (!assignment) {
    throw new BadRequestError('Alteration is not available today');
  }
}

async function getRequestedMatch(request: AlterPickRequest): Promise<MatchItem> {
  const match = await getItem<MatchItem>(environment.matchesTableName, {
    matchId: request.matchId,
  });

  if (!match) {
    throw new BadRequestError(`Unknown matchId: ${request.matchId}`);
  }

  return match;
}

function validateMatchCalendarDate(match: MatchItem, request: AlterPickRequest): void {
  const matchCalendarDate = getArgentinaDateStringFromIso(match.kickoffAt);

  if (matchCalendarDate !== request.calendarDate) {
    throw new BadRequestError(
      `Match ${request.matchId} does not belong to calendar date ${request.calendarDate}`,
    );
  }
}

function validateMatchCanBeAltered(match: MatchItem, request: AlterPickRequest): void {
  if (match.kickoffAt <= new Date().toISOString()) {
    throw new BadRequestError(`Kickoff has passed for match ${request.matchId}`);
  }

  if (match.status === 2) {
    throw new BadRequestError(`Match ${request.matchId} is finalized`);
  }
}
