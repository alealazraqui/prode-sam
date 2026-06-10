/** Shape of a row in the Stealers DynamoDB table. */
export type StealerItem = {
  dayId: string;
  stealerUsername: string;
  availableMatchSteals?: string[];
  matchId?: string;
  victimUsername?: string;
};

/** Shape of a row in the BlockedVictims DynamoDB table. */
export type BlockedVictimItem = {
  username: string;
};
