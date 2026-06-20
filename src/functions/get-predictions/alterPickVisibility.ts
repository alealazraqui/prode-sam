import type { MatchItem } from '@/functions/get-matches/types';

export type AlterPickVisibility = 'hidden' | 'revealedWithoutDetails' | 'revealedWithDetails';

function isPostKickoff(kickoffAt: string, now: number): boolean {
  return new Date(kickoffAt).getTime() <= now;
}

export function resolveAlterPickVisibility(
  match: MatchItem | undefined,
  now = Date.now(),
): AlterPickVisibility {
  if (match == null) {
    return 'hidden';
  }

  if (match.status === 2) {
    return 'revealedWithDetails';
  }

  if (isPostKickoff(match.kickoffAt, now)) {
    return 'revealedWithoutDetails';
  }

  return 'hidden';
}
