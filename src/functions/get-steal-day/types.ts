export type StealerEntry = {
  stealerUsername: string;
  matchId?: string;
  victimUsername?: string;
};

export type StealDayResponse = {
  eventType: 'common' | 'players' | 'steal';
  stealers: StealerEntry[];
  blockedUsernames: string[];
  currentUserIsSteal: boolean;
};
