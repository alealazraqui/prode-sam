import jwt from 'jsonwebtoken';
import { environment } from '../config/environment';

export type JwtPayload = {
  username: string;
  alias?: string;
};

export function createJwt(payload: JwtPayload): string {
  return jwt.sign(payload, environment.jwtSecret, { expiresIn: '180d' });
}
