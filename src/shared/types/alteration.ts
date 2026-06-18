/** Side of the rival prediction affected by an alteration. */
export type AlterSide = 'home' | 'away';

/** Goal delta applied by an alteration. */
export type AlterDelta = 1 | -1;

/** Shape of a row in the AlterAssignments DynamoDB table. */
export type AlterAssignmentItem = {
  calendarDate: string;
  username: string;
};

/** Shape of a row in the AlterPicks DynamoDB table. */
export type AlterPickItem = {
  altererUsername: string;
  victimUsername: string;
  calendarDate: string;
  matchId: string;
  side: AlterSide;
  delta: AlterDelta;
  createdAt: string;
};

/** Shape of a row in the AlterVictimLocks DynamoDB table. */
export type AlterVictimLockItem = {
  victimUsername: string;
};
