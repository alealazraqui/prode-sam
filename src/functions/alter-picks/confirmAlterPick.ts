import type { AlterPickRequest } from './types';
import { saveAlterPick } from './saveAlterPick';
import { validateAlterPick } from './validateAlterPick';

export async function confirmAlterPick(
  altererUsername: string,
  request: AlterPickRequest,
): Promise<void> {
  await validateAlterPick(altererUsername, request);
  await saveAlterPick(altererUsername, request);
}
