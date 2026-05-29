export async function withTestEnv<T>(
  vars: Record<string, string>,
  fn: () => T | Promise<T>,
): Promise<T> {
  const previous = new Map<string, string | undefined>();

  for (const [key, value] of Object.entries(vars)) {
    previous.set(key, process.env[key]);
    process.env[key] = value;
  }

  try {
    return await fn();
  } finally {
    for (const [key, value] of previous.entries()) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  }
}
