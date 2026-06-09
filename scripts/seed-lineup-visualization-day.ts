/**
 * Seed de día pasado tipo jugadores para probar visualización de lineup picks.
 *
 * - DayEvent: 2026-06-08 → jugadores
 * - Matches: 2 partidos ese día (sin predictions)
 * - LineupPicks: un pick por usuario con alias, jugadores ficticios y puntaje
 *
 * Uso:
 *   $env:AWS_PROFILE = "prode-dev"
 *   npx tsx scripts/seed-lineup-visualization-day.ts
 */

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';
import { DayEventType } from '../src/shared/types/dayEventType';
import type { LineupPickItem } from '../src/shared/types/lineupPickItem';
import type { MatchItem } from '../src/functions/get-matches/types';
import type { UserItem } from '../src/shared/types/userItem';

const EVENT_DAY = '2026-06-08';

const USERS_TABLE = process.env.USERS_TABLE_NAME ?? 'Users';
const MATCHES_TABLE = process.env.MATCHES_TABLE_NAME ?? 'Matches';
const DAY_EVENTS_TABLE = process.env.DAY_EVENTS_TABLE_NAME ?? 'DayEvents';
const LINEUP_PICKS_TABLE = process.env.LINEUP_PICKS_TABLE_NAME ?? 'LineupPicks';

const ARGENTINA_TIME_ZONE = 'America/Argentina/Buenos_Aires';

const client = DynamoDBDocumentClient.from(new DynamoDBClient({ region: 'us-east-1' }));

const MOCK_MATCHES: MatchItem[] = [
  {
    matchId: 'mock-jun08-1',
    homeTeamName: 'Uruguay',
    homeTeamCode: 'URU',
    awayTeamName: 'Colombia',
    awayTeamCode: 'COL',
    homeGoals: 2,
    awayGoals: 1,
    kickoffAt: argentinaLocalToUtcIso(EVENT_DAY, 15),
    status: 2,
    isFirstRound: false,
  },
  {
    matchId: 'mock-jun08-2',
    homeTeamName: 'México',
    homeTeamCode: 'MEX',
    awayTeamName: 'Chile',
    awayTeamCode: 'CHI',
    homeGoals: 0,
    awayGoals: 0,
    kickoffAt: argentinaLocalToUtcIso(EVENT_DAY, 21),
    status: 2,
    isFirstRound: false,
  },
];

const DEFENSORS = [
  'Virgil van Dijk',
  'Cristian Romero',
  'Marquinhos',
  'Rúben Dias',
  'William Saliba',
  'Achraf Hakimi',
  'Theo Hernández',
  'João Cancelo',
  'Trent Alexander-Arnold',
  'Federico Valverde',
  'Declan Rice',
];

const MEDIOCAMPISTAS = [
  'Luka Modrić',
  'Kevin De Bruyne',
  'Rodri',
  'Jude Bellingham',
  'Pedri',
  'Bruno Fernandes',
  'Bernardo Silva',
  'Federico Valverde',
  'Enzo Fernández',
  'Vitinha',
  'Ilkay Gündogan',
];

const DELANTEROS = [
  'Erling Haaland',
  'Kylian Mbappé',
  'Lionel Messi',
  'Harry Kane',
  'Vinícius Júnior',
  'Lautaro Martínez',
  'Mohamed Salah',
  'Robert Lewandowski',
  'Antoine Griezmann',
  'Rafael Leão',
  'Julian Alvarez',
];

const SAMPLE_POINTS = [12, 8, 5, 3, 0, 15, 7, null, 10, 4, 6] as const;

function argentinaLocalToUtcIso(date: string, hour: number, minute = 0): string {
  const [year, month, day] = date.split('-').map(Number);
  const utcGuess = Date.UTC(year, month - 1, day, hour, minute);
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: ARGENTINA_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

  const parts = formatter.formatToParts(new Date(utcGuess));
  const get = (type: Intl.DateTimeFormatPartTypes): number =>
    Number(parts.find((p) => p.type === type)?.value ?? 0);

  const offsetMinutes =
    (hour - get('hour')) * 60 + (minute - get('minute')) + (day - get('day')) * 24 * 60;

  return new Date(utcGuess + offsetMinutes * 60_000).toISOString();
}

async function scanAll<T>(tableName: string): Promise<T[]> {
  const items: T[] = [];
  let lastKey: Record<string, unknown> | undefined;

  do {
    const response = await client.send(
      new ScanCommand({ TableName: tableName, ExclusiveStartKey: lastKey }),
    );
    items.push(...((response.Items as T[]) ?? []));
    lastKey = response.LastEvaluatedKey as Record<string, unknown> | undefined;
  } while (lastKey !== undefined);

  return items;
}

async function seedDayEvent(): Promise<void> {
  await client.send(
    new PutCommand({
      TableName: DAY_EVENTS_TABLE,
      Item: { date: EVENT_DAY, eventType: DayEventType.Jugadores },
    }),
  );
  console.log(`  ✓ DayEvent ${EVENT_DAY}: jugadores`);
}

async function seedMatches(): Promise<void> {
  await Promise.all(
    MOCK_MATCHES.map((match) =>
      client.send(new PutCommand({ TableName: MATCHES_TABLE, Item: match })),
    ),
  );

  for (const match of MOCK_MATCHES) {
    console.log(
      `  ✓ ${match.matchId}: ${match.homeTeamName} vs ${match.awayTeamName} @ ${match.kickoffAt} (status=${match.status})`,
    );
  }
}

function buildLineupPick(user: UserItem, index: number): LineupPickItem {
  return {
    eventDay: EVENT_DAY,
    username: user.username,
    alias: user.alias ?? user.username,
    defensor: DEFENSORS[index % DEFENSORS.length] ?? 'Defensor mock',
    mediocampista: MEDIOCAMPISTAS[(index + 2) % MEDIOCAMPISTAS.length] ?? 'Medio mock',
    delantero: DELANTEROS[(index + 4) % DELANTEROS.length] ?? 'Delantero mock',
    points: SAMPLE_POINTS[index % SAMPLE_POINTS.length],
  };
}

async function seedLineupPicks(users: UserItem[]): Promise<void> {
  const sortedUsers = [...users].sort((a, b) =>
    (a.alias ?? a.username).localeCompare(b.alias ?? b.username, 'es'),
  );

  await Promise.all(
    sortedUsers.map((user, index) => {
      const item = buildLineupPick(user, index);
      return client.send(new PutCommand({ TableName: LINEUP_PICKS_TABLE, Item: item }));
    }),
  );

  for (const [index, user] of sortedUsers.entries()) {
    const pick = buildLineupPick(user, index);
    console.log(
      `  ✓ ${pick.alias}: ${pick.defensor} / ${pick.mediocampista} / ${pick.delantero} → ${pick.points ?? 'null'} pts`,
    );
  }
}

async function main(): Promise<void> {
  console.log(`=== Seed visualización lineup picks (${EVENT_DAY}) ===\n`);

  const users = await scanAll<UserItem>(USERS_TABLE);
  if (users.length === 0) {
    throw new Error(`No users found in table "${USERS_TABLE}". Run seed:users first.`);
  }

  console.log('Configurando DayEvent...');
  await seedDayEvent();

  console.log('\nCargando partidos (sin predictions)...');
  await seedMatches();

  console.log(`\nCargando LineupPicks (${users.length} usuarios)...`);
  await seedLineupPicks(users);

  console.log('\n=== Listo ===');
  console.log(`Día ${EVENT_DAY} listo para probar tabla de picks pasados en el calendario.`);
}

main().catch((err: unknown) => {
  const message = err instanceof Error ? err.message : String(err);
  console.error(`Error: ${message}`);
  process.exit(1);
});
