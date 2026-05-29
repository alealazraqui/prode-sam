import jwt from 'jsonwebtoken';
import { UnauthorizedError } from '../errors/UnauthorizedError';
import { environment } from '../config/environment';
import { asOptionalString, isNonEmptyString } from '../validation/typeValidation';
import type { JwtPayload } from './createJwt';

export function verifyJwt(token: string): JwtPayload {
  try {
    const decoded = jwt.verify(token, environment.jwtSecret) as jwt.JwtPayload & JwtPayload;

    if (!isNonEmptyString(decoded.username)) {
      throw new UnauthorizedError();
    }

    return {
      username: decoded.username,
      alias: asOptionalString(decoded.alias),
    };
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      throw error;
    }

    throw new UnauthorizedError();
  }
}
