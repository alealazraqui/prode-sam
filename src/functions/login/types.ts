export type LoginInput = {
  username: string;
  password: string;
};

export type LoginResponse = {
  token: string;
};

export type UserItem = {
  username: string;
  alias?: string;
  password: string;
  score?: number;
  rankingPosition?: number;
};
