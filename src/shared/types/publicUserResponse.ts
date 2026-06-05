/** Public user fields exposed by API responses (no password). */
export type PublicUserResponse = {
  username: string;
  alias: string;
  score: number;
  rankingPosition: number;
};
