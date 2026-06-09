export type LineupPickResponse = {
  eventDay: string;
  username: string;
  alias: string;
  defensor: string;
  mediocampista: string;
  delantero: string;
  points: number | null;
};

export type GetLineupPicksResponse = {
  allPastPicks: LineupPickResponse[];
  myFuturePicks: LineupPickResponse[];
};
