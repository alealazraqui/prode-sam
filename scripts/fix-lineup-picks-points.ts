/**
 * Corrige puntajes inválidos en LineupPicks (válidos: 1–6 o null).
 *
 * Regla de referencia por posición: delantero 1, mediocampista 2, defensor 3 (máx. 6).
 *
 * Uso:
 *   $env:AWS_PROFILE = "prode-dev"
 *   npx tsx scripts/fix-lineup-picks-points.ts
 */

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';

import type { LineupPickItem } from '../src/shared/types/lineupPickItem';

const LINEUP_PICKS_TABLE = process.env.LINEUP_PICKS_TABLE_NAME ?? 'LineupPicks';

/** Puntajes válidos de demo, en rango 1–6 (incluye null para pendiente). */
const VALID_DEMO_POINTS = [6, 5, 4, 3, 2, 1, null, 6, 5, 4, 3] as const;

const client = DynamoDBDocumentClient.from(new DynamoDBClient({ region: 'us-east-1' }));

function isValidPoints(value: number | null | undefined): boolean {
  if (value == null) return true;
  return Number.isInteger(value) && value >= 1 && value <= 6;
}

async function scanAllLineupPicks(): Promise<LineupPickItem[]> {
  const items: LineupPickItem[] = [];
  let lastKey: Record<string, unknown> | undefined;

  do {
    const response = await client.send(
      new ScanCommand({ TableName: LINEUP_PICKS_TABLE, ExclusiveStartKey: lastKey }),
    );
    items.push(...((response.Items as LineupPickItem[]) ?? []));
    lastKey = response.LastEvaluatedKey as Record<string, unknown> | undefined;
  } while (lastKey !== undefined);

  return items;
}

async function main(): Promise<void> {
  console.log(`=== Fix LineupPicks points (${LINEUP_PICKS_TABLE}) ===\n`);

  const picks = await scanAllLineupPicks();
  if (picks.length === 0) {
    console.log('No hay items en la tabla.');
    return;
  }

  const sorted = [...picks].sort((a, b) =>
    (a.alias ?? a.username).localeCompare(b.alias ?? b.username, 'es'),
  );

  let fixed = 0;

  for (const [index, pick] of sorted.entries()) {
    if (isValidPoints(pick.points)) {
      console.log(`  = ${pick.alias}: ${pick.points ?? 'null'} pts (ok)`);
      continue;
    }

    const newPoints = VALID_DEMO_POINTS[index % VALID_DEMO_POINTS.length] ?? null;

    await client.send(
      new UpdateCommand({
        TableName: LINEUP_PICKS_TABLE,
        Key: { eventDay: pick.eventDay, username: pick.username },
        UpdateExpression: 'SET #points = :points',
        ExpressionAttributeNames: { '#points': 'points' },
        ExpressionAttributeValues: { ':points': newPoints },
      }),
    );

    console.log(`  ✓ ${pick.alias}: ${pick.points} → ${newPoints ?? 'null'} pts`);
    fixed += 1;
  }

  console.log(`\n=== Listo: ${fixed} item(s) actualizado(s) ===`);
}

main().catch((err: unknown) => {
  const message = err instanceof Error ? err.message : String(err);
  console.error(`Error: ${message}`);
  process.exit(1);
});
