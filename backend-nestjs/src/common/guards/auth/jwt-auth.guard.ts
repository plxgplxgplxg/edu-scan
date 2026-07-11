/* eslint-disable @typescript-eslint/no-unused-vars, @typescript-eslint/only-throw-error */
import {
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  handleRequest<TUser = unknown>(
    err: unknown,
    user: TUser,
    info: { message?: string; name?: string } | undefined,
    _context: ExecutionContext,
  ): TUser {
    if (err) {
      throw err;
    }

    if (user) {
      return user;
    }

    if (info?.name === 'TokenExpiredError') {
      throw new UnauthorizedException('Access token has expired');
    }

    if (info?.message === 'No auth token') {
      throw new UnauthorizedException('Access token is required');
    }

    if (info?.message) {
      throw new UnauthorizedException(info.message);
    }

    throw new UnauthorizedException('Invalid or missing access token');
  }
}
