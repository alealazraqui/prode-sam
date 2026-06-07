/** Shape of a row in the Stealers DynamoDB table. */
export type StealerItem = {
  calendarDate: string;
  stealerUsername: string;
  matchId?: string;
  victimUsername?: string;
};

/** Shape of a row in the BlockedVictims DynamoDB table. */
export type BlockedVictimItem = {
  username: string;
};
