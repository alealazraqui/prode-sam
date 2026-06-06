/**
 * Seed de predicciones mock multi-jugador para pruebas manuales de QA.
 *
 * Genera predicciones para todos los jugadores en cada partido mock:
 *   - Partidos finalizados (status=2): pointsCommon precalculado (3/1/0).
 *   - Partidos pendientes  (status=1): pointsCommon=null.
 *
 * Para seedear los partidos mock en la tabla Matches, usar el script existente:
 *   AWS_PROFILE=prode-dev npm run seed:matches -- --file scripts/seed-predictions/mock-matches.csv --table Matches
 *
 * Uso:
 *   AWS_PROFILE=prode-dev npm run seed:predictions -- --table Predictions
 */

import { createReadStream } from 'node:fs';
import { resolve } from 'node:path';
import { createInterface } from 'node:readline';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';
import type { SeedPredictionItem } from './types';

const DEFAULT_MOCK_MATCHES_FILE = resolve(__dirname, 'mock-matches.csv');
const USERS_FILE = resolve(__dirname, '../seed-users/users.json');

/**
 * Predicciones hardcodeadas por matchId y username.
 * pointsCommon precalculado para partidos finalizados:
 *   mock-m001: ARG 2-1 BRA → exacto=3pts, direccion(local)=1pt, direccion(visitante)=0pts
 *   mock-m002: FRA 0-0 GER → exacto=3pts, empate(diferente)=1pt, direccion(errada)=0pts
 * Para partidos pendientes (mock-m003, mock-m004): pointsCommon=null.
 */
const FINISHED_PREDICTIONS: Record<
  string,
  Record<string, { homeGoals: number; awayGoals: number; pointsCommon: number }>
> = {
  'mock-m001': {
    // Exacto (ARG 2-1 BRA) → 3 pts
    'alejandro.alazraqui': { homeGoals: 2, awayGoals: 1, pointsCommon: 3 },
    'bruno.munoz': { homeGoals: 2, awayGoals: 1, pointsCommon: 3 },
    'marco.munoz': { homeGoals: 2, awayGoals: 1, pointsCommon: 3 },
    // Dirección correcta (gana local, pero marcador distinto) → 1 pt
    'simbad.peralta': { homeGoals: 1, awayGoals: 0, pointsCommon: 1 },
    'sebastian.pasarin': { homeGoals: 3, awayGoals: 1, pointsCommon: 1 },
    'nicolas.sanchez': { homeGoals: 2, awayGoals: 0, pointsCommon: 1 },
    'franco.dicarlo': { homeGoals: 1, awayGoals: 0, pointsCommon: 1 },
    // Dirección incorrecta (gana visitante o empate) → 0 pts
    'thomas.colagiovanni': { homeGoals: 0, awayGoals: 2, pointsCommon: 0 },
    'julian.borgo': { homeGoals: 1, awayGoals: 2, pointsCommon: 0 },
    'agustin.martinez': { homeGoals: 0, awayGoals: 1, pointsCommon: 0 },
    'daniel.golluscio': { homeGoals: 1, awayGoals: 1, pointsCommon: 0 },
  },
  'mock-m002': {
    // Exacto (FRA 0-0 GER) → 3 pts
    'alejandro.alazraqui': { homeGoals: 0, awayGoals: 0, pointsCommon: 3 },
    'thomas.colagiovanni': { homeGoals: 0, awayGoals: 0, pointsCommon: 3 },
    'agustin.martinez': { homeGoals: 0, awayGoals: 0, pointsCommon: 3 },
    // Empate (distinto marcador) → 1 pt
    'bruno.munoz': { homeGoals: 1, awayGoals: 1, pointsCommon: 1 },
    'simbad.peralta': { homeGoals: 2, awayGoals: 2, pointsCommon: 1 },
    'franco.dicarlo': { homeGoals: 1, awayGoals: 1, pointsCommon: 1 },
    'julian.borgo': { homeGoals: 2, awayGoals: 2, pointsCommon: 1 },
    // Dirección incorrecta (gana local o visitante) → 0 pts
    'marco.munoz': { homeGoals: 1, awayGoals: 0, pointsCommon: 0 },
    'sebastian.pasarin': { homeGoals: 2, awayGoals: 0, pointsCommon: 0 },
    'nicolas.sanchez': { homeGoals: 0, awayGoals: 1, pointsCommon: 0 },
    'daniel.golluscio': { homeGoals: 1, awayGoals: 2, pointsCommon: 0 },
  },
  // mock-m005 y mock-m006: solo 4 jugadores predijeron (el resto no tiene predicción)
  'mock-m005': {
    // Uruguay 1-0 Colombia
    'alejandro.alazraqui': { homeGoals: 1, awayGoals: 0, pointsCommon: 3 },
    'bruno.munoz': { homeGoals: 2, awayGoals: 1, pointsCommon: 1 },
    'marco.munoz': { homeGoals: 0, awayGoals: 1, pointsCommon: 0 },
    'simbad.peralta': { homeGoals: 1, awayGoals: 0, pointsCommon: 3 },
  },
  'mock-m006': {
    // Ecuador 2-2 Perú
    'alejandro.alazraqui': { homeGoals: 2, awayGoals: 2, pointsCommon: 3 },
    'bruno.munoz': { homeGoals: 1, awayGoals: 1, pointsCommon: 1 },
    'marco.munoz': { homeGoals: 3, awayGoals: 1, pointsCommon: 0 },
    'simbad.peralta': { homeGoals: 0, awayGoals: 0, pointsCommon: 1 },
  },
};

const PENDING_PREDICTION_DEFAULT = { homeGoals: 1, awayGoals: 0 };

async function main(): Promise<void> {
  const { tableName: cliTable, matchesFile } = parseArgs(process.argv.slice(2));
  const tableName = resolveTableName(cliTable);
  await seedPredictions(tableName, matchesFile);
}

function parseArgs(argv: string[]): { tableName?: string; matchesFile: string } {
  let tableName: string | undefined;
  let matchesFile = DEFAULT_MOCK_MATCHES_FILE;

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--table' && argv[i + 1]) {
      tableName = argv[i + 1];
      i += 1;
    } else if (arg.startsWith('--table=')) {
      tableName = arg.slice('--table='.length);
    } else if (arg === '--file' && argv[i + 1]) {
      matchesFile = resolve(argv[i + 1]);
      i += 1;
    } else if (arg.startsWith('--file=')) {
      matchesFile = resolve(arg.slice('--file='.length));
    }
  }

  return { tableName, matchesFile };
}

function resolveTableName(cliTable?: string): string {
  const tableName = cliTable ?? process.env.PREDICTIONS_TABLE_NAME;
  if (!tableName) {
    throw new Error(
      'Missing table name. Set PREDICTIONS_TABLE_NAME or pass --table <name> (e.g. Predictions).',
    );
  }
  return tableName;
}

async function seedPredictions(tableName: string, matchesFile: string): Promise<void> {
  const users = loadUsers();
  const matches = await loadMockMatchesFromCsv(matchesFile);
  const client = DynamoDBDocumentClient.from(new DynamoDBClient({}));
  const updatedAt = new Date().toISOString();

  let total = 0;
  for (const match of matches) {
    const predictions = buildPredictionsForMatch(match, users, updatedAt);
    for (const item of predictions) {
      await putPrediction(client, tableName, item);
      total += 1;
    }
    console.log(
      `Seeded ${predictions.length} predictions for match ${match.matchId} (${match.label})`,
    );
  }

  console.log(`Done. ${total} prediction(s) written to table "${tableName}".`);
}

function loadUsers(): string[] {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const raw = require(USERS_FILE) as Array<{ username: string }>;
  return raw.map((u) => u.username);
}

async function loadMockMatchesFromCsv(filePath: string): Promise<MockMatch[]> {
  const lines = await readCsvLines(filePath);
  if (lines.length < 2) {
    throw new Error(`CSV file "${filePath}" is empty or missing data rows.`);
  }
  const headers = parseCsvLine(lines[0]);
  const matches: MockMatch[] = [];
  for (let i = 1; i < lines.length; i += 1) {
    const line = lines[i].trim();
    if (!line) continue;
    const values = parseCsvLine(line);
    const row = Object.fromEntries(headers.map((h, idx) => [h, values[idx] ?? '']));
    matches.push(parseMockMatchRow(row));
  }
  return matches;
}

async function readCsvLines(filePath: string): Promise<string[]> {
  return new Promise((resolve, reject) => {
    const lines: string[] = [];
    const rl = createInterface({ input: createReadStream(filePath), crlfDelay: Infinity });
    rl.on('line', (line) => lines.push(line));
    rl.on('close', () => resolve(lines));
    rl.on('error', reject);
  });
}

function parseCsvLine(line: string): string[] {
  return line.split(',').map((v) => v.trim());
}

type MockMatch = {
  matchId: string;
  kickoffAt: string;
  status: 1 | 2;
  label: string;
};

function parseMockMatchRow(row: Record<string, string>): MockMatch {
  const matchId = row['matchId'];
  if (!matchId) throw new Error('Invalid row: matchId is required');

  const kickoffAt = row['kickoffAt'];
  if (!kickoffAt) throw new Error(`Invalid row: kickoffAt is required (matchId=${matchId})`);

  const statusRaw = Number(row['status']);
  if (statusRaw !== 1 && statusRaw !== 2) {
    throw new Error(`Invalid status "${row['status']}" for matchId=${matchId}. Expected 1 or 2.`);
  }

  return {
    matchId,
    kickoffAt,
    status: statusRaw as 1 | 2,
    label: `${row['homeTeamName']} vs ${row['awayTeamName']}`,
  };
}

function buildPredictionsForMatch(
  match: MockMatch,
  users: string[],
  updatedAt: string,
): SeedPredictionItem[] {
  return users
    .map((username) => buildPredictionItem(username, match, updatedAt))
    .filter((item): item is SeedPredictionItem => item !== null);
}

function buildPredictionItem(
  username: string,
  match: MockMatch,
  updatedAt: string,
): SeedPredictionItem | null {
  if (match.status === 2) {
    const pred = FINISHED_PREDICTIONS[match.matchId]?.[username];
    if (!pred) return null;
    return {
      username,
      matchId: match.matchId,
      homeGoals: pred.homeGoals,
      awayGoals: pred.awayGoals,
      updatedAt,
      kickoffAt: match.kickoffAt,
      pointsCommon: pred.pointsCommon,
    };
  }

  return {
    username,
    matchId: match.matchId,
    homeGoals: PENDING_PREDICTION_DEFAULT.homeGoals,
    awayGoals: PENDING_PREDICTION_DEFAULT.awayGoals,
    updatedAt,
    kickoffAt: match.kickoffAt,
    pointsCommon: null,
  };
}

async function putPrediction(
  client: DynamoDBDocumentClient,
  tableName: string,
  item: SeedPredictionItem,
): Promise<void> {
  await client.send(
    new PutCommand({
      TableName: tableName,
      Item: item,
    }),
  );
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Seed failed: ${message}`);
  process.exit(1);
});
