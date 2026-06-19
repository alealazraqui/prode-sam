const ARGENTINA_TIME_ZONE = 'America/Argentina/Buenos_Aires';

export function getArgentinaTodayDateString(now: Date = new Date()): string {
  return now.toLocaleDateString('en-CA', { timeZone: ARGENTINA_TIME_ZONE });
}

export function getArgentinaDateStringFromIso(iso: string): string {
  return new Date(iso).toLocaleDateString('en-CA', { timeZone: ARGENTINA_TIME_ZONE });
}
