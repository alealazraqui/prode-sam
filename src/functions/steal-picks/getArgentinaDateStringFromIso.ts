const ARGENTINA_TIME_ZONE = 'America/Argentina/Buenos_Aires';

export function getArgentinaDateStringFromIso(iso: string): string {
  return new Date(iso).toLocaleDateString('en-CA', { timeZone: ARGENTINA_TIME_ZONE });
}
