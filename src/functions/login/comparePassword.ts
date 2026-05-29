export function comparePassword(storedPassword: string, providedPassword: string): boolean {
  return storedPassword === providedPassword;
}
