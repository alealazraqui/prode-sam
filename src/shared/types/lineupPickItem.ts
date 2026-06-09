/** Shape of a row in the LineupPicks DynamoDB table. */
export type LineupPickItem = {
  eventDay: string;
  username: string;
  defensor: string;
  mediocampista: string;
  delantero: string;
  points: number | null;
};
