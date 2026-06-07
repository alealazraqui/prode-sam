export type EventTypeResponse = {
  eventType: 'common' | 'players' | 'steal';
  currentUserIsSteal: boolean;
  blockedUsernames: string[];
};
