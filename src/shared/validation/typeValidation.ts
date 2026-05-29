export function isString(value: unknown): value is string {
  return typeof value === 'string';
}

export function isNonEmptyString(value: unknown): value is string {
  return isString(value) && value.length > 0;
}

export function asOptionalString(value: unknown): string | undefined {
  return isString(value) ? value : undefined;
}
