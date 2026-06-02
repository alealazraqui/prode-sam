import { spawn, spawnSync } from 'node:child_process';
import { loadEnvLocal } from './load-env-local';

const DEBUG_PORT = '9229';
const useDebugger = !process.argv.includes('--no-debug');

try {
  loadEnvLocal();
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}

const jwtSecret = process.env.JWT_SECRET;

if (!jwtSecret) {
  console.error('JWT_SECRET is required in .env.local');
  process.exit(1);
}

process.env.AWS_PROFILE ??= 'prode-dev';

console.log('');
console.log('=== API local (sin deploy) ===');
console.log('  1. sam build          → compila Lambdas en .aws-sam/');
console.log('  2. sam local start-api → API en http://127.0.0.1:3000');
console.log('  DynamoDB: tabla Users en AWS (profile prode-dev)');
console.log('');

console.log('> sam build');
const buildResult = spawnSync('sam', ['build'], {
  stdio: 'inherit',
  shell: true,
  env: process.env,
});

if (buildResult.status !== 0) {
  process.exit(buildResult.status ?? 1);
}

const samArgs = [
  'local',
  'start-api',
  '--profile',
  'prode-dev',
  '--parameter-overrides',
  `JwtSecret=${jwtSecret}`,
  '--warm-containers',
  'EAGER',
];

if (useDebugger) {
  samArgs.push('-d', DEBUG_PORT);
}

const samCommand = `sam ${samArgs.join(' ')}`;
console.log(`> ${samCommand}`);
console.log('');

if (useDebugger) {
  console.log(
    `Debugger en puerto ${DEBUG_PORT}. Para breakpoints: Run and Debug → "Attach: SAM local Lambdas (9229)"`,
  );
  console.log('');
}

const child = spawn('sam', samArgs, {
  stdio: 'inherit',
  shell: true,
  env: process.env,
});

child.on('exit', (code) => {
  process.exit(code ?? 0);
});
