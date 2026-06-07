/** Shape of a row in the StealPicks DynamoDB table (ledger). */
export type StealPickItem = {
  calendarDate: string;
  stealerUsername: string;
  victimUsername: string;
  matchId: string;
  stolenPoints: number;
};
