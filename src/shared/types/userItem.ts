/** Shape of a user row in the Users DynamoDB table. */
export type UserItem = {
  username: string;
  alias?: string;
  password: string;
  score?: number;
  rankingPosition?: number;
  rankingDif?: number;
};
