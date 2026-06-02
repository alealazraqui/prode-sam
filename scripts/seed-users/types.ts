export type SeedUserInput = {
  username: string;
  alias: string;
  password: string;
};

export type SeedUserItem = SeedUserInput & {
  score: number;
  rankingPosition: number;
};
