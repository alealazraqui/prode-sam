import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

import { loadEnvLocal } from './load-env-local';

try {
  loadEnvLocal();
} catch {
  // .env.local optional for debug-invoke when JWT_SECRET is set via launch.json envFile
}

process.env.USERS_TABLE_NAME ??= 'Users';
process.env.MATCHES_TABLE_NAME ??= 'Matches';
process.env.PREDICTIONS_TABLE_NAME ??= 'Predictions';
process.env.DAY_EVENTS_TABLE_NAME ??= 'DayEvents';

async function main(): Promise<void> {
  const [caseName, invocationName] = process.argv.slice(2);

  if (!caseName || !invocationName) {
    printUsage();
    process.exit(1);
  }

  const functionsRoot = resolve(__dirname, '../src/functions');
  const caseRoot = resolve(functionsRoot, caseName);
  const invocationsDir = resolve(caseRoot, 'invocations');
  const eventPath = resolve(invocationsDir, `${invocationName}.json`);
  const handlerPath = resolve(caseRoot, 'handler.ts');

  if (!existsSync(handlerPath)) {
    console.error(`Handler not found: ${handlerPath}`);
    listAvailableCases(functionsRoot);
    process.exit(1);
  }

  if (!existsSync(eventPath)) {
    console.error(`Invocation event not found: ${eventPath}`);
    listAvailableInvocations(invocationsDir, caseName);
    process.exit(1);
  }

  const event = JSON.parse(readFileSync(eventPath, 'utf-8')) as unknown;

  console.log(`Debugging ${caseName}/${invocationName}`);
  console.log(`Event: ${eventPath}`);
  console.log(`Handler: ${handlerPath}`);
  console.log('---');

  const { handler } = (await import(pathToFileURL(handlerPath).href)) as {
    handler: (event: unknown) => Promise<unknown>;
  };

  const result = await handler(event);

  console.log('---');
  console.log('Response:');
  console.log(JSON.stringify(result, null, 2));
}

function printUsage(): void {
  console.error('Usage: tsx scripts/debug-invoke.ts <caso-de-uso> <invocacion>');
  console.error('Example: tsx scripts/debug-invoke.ts login login-success');
}

function listAvailableCases(functionsRoot: string): void {
  if (!existsSync(functionsRoot)) {
    return;
  }

  const cases = readdirSync(functionsRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name);

  if (cases.length > 0) {
    console.error(`Available cases: ${cases.join(', ')}`);
  }
}

function listAvailableInvocations(invocationsDir: string, caseName: string): void {
  if (!existsSync(invocationsDir)) {
    console.error(`No invocations/ folder for case "${caseName}".`);
    return;
  }

  const invocations = readdirSync(invocationsDir)
    .filter((file) => file.endsWith('.json'))
    .map((file) => file.replace(/\.json$/, ''));

  if (invocations.length > 0) {
    console.error(`Available invocations: ${invocations.join(', ')}`);
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
