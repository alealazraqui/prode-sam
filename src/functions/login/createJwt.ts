import jwt from 'jsonwebtoken';
import { environment } from '@/shared/config/environment';
import type { JwtPayload } from '@/shared/auth/jwtPayload';

export function createJwt(payload: JwtPayload): string {
  return jwt.sign(payload, environment.jwtSecret, { expiresIn: '180d' });
}
