/** Shape of a row in the LineupPicks DynamoDB table. */
export type LineupPickItem = {
  eventDay: string;
  username: string;
  /** Denormalized from Users at write time to avoid a Users scan on read. */
  alias: string;
  defensor: string;
  mediocampista: string;
  delantero: string;
  points: number | null;
};
