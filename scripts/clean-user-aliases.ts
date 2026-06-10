/**
 * Quita prefijos de ordenamiento en alias (ej. "0 - ", "1 - ", "A A A ").
 *
 * Uso:
 *   $env:AWS_PROFILE = "prode-dev"
 *   npx tsx scripts/clean-user-aliases.ts          # dry-run
 *   npx tsx scripts/clean-user-aliases.ts --apply  # aplica cambios
 */

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';

import type { LineupPickItem } from '../src/shared/types/lineupPickItem';
import type { UserItem } from '../src/shared/types/userItem';

const USERS_TABLE = process.env.USERS_TABLE_NAME ?? 'Users';
const LINEUP_PICKS_TABLE = process.env.LINEUP_PICKS_TABLE_NAME ?? 'LineupPicks';

const client = DynamoDBDocumentClient.from(new DynamoDBClient({ region: 'us-east-1' }));

export function cleanAlias(alias: string): string {
  let cleaned = alias.trim();
  cleaned = cleaned.replace(/^\d+\s*-\s*/, '');
  cleaned = cleaned.replace(/^A\s+A\s+A\s+/, '');
  return cleaned.trim();
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

async function main(): Promise<void> {
  const apply = process.argv.includes('--apply');

  console.log(`=== Clean user aliases (${apply ? 'APPLY' : 'DRY-RUN'}) ===\n`);

  const users = await scanAll<UserItem>(USERS_TABLE);
  const userUpdates = users
    .filter((user) => user.alias && cleanAlias(user.alias) !== user.alias)
    .map((user) => ({
      username: user.username,
      before: user.alias!,
      after: cleanAlias(user.alias!),
    }));

  const picks = await scanAll<LineupPickItem>(LINEUP_PICKS_TABLE);
  const pickUpdates = picks
    .filter((pick) => pick.alias && cleanAlias(pick.alias) !== pick.alias)
    .map((pick) => ({
      eventDay: pick.eventDay,
      username: pick.username,
      before: pick.alias,
      after: cleanAlias(pick.alias),
    }));

  console.log(`Users (${USERS_TABLE}): ${userUpdates.length} cambio(s)`);
  for (const update of userUpdates) {
    console.log(`  ${update.username}: "${update.before}" → "${update.after}"`);
  }

  console.log(`\nLineupPicks (${LINEUP_PICKS_TABLE}): ${pickUpdates.length} cambio(s)`);
  for (const update of pickUpdates) {
    console.log(
      `  ${update.eventDay} / ${update.username}: "${update.before}" → "${update.after}"`,
    );
  }

  if (!apply) {
    console.log('\nDry-run. Pasá --apply para escribir en DynamoDB.');
    return;
  }

  for (const update of userUpdates) {
    await client.send(
      new UpdateCommand({
        TableName: USERS_TABLE,
        Key: { username: update.username },
        UpdateExpression: 'SET #alias = :alias',
        ExpressionAttributeNames: { '#alias': 'alias' },
        ExpressionAttributeValues: { ':alias': update.after },
      }),
    );
  }

  for (const update of pickUpdates) {
    await client.send(
      new UpdateCommand({
        TableName: LINEUP_PICKS_TABLE,
        Key: { eventDay: update.eventDay, username: update.username },
        UpdateExpression: 'SET #alias = :alias',
        ExpressionAttributeNames: { '#alias': 'alias' },
        ExpressionAttributeValues: { ':alias': update.after },
      }),
    );
  }

  console.log(
    `\n=== Listo: ${userUpdates.length + pickUpdates.length} update(s) aplicado(s) ===`,
  );
}

main().catch((err: unknown) => {
  const message = err instanceof Error ? err.message : String(err);
  console.error(`Error: ${message}`);
  process.exit(1);
});
