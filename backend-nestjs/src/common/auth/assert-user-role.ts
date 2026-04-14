import { ForbiddenException } from '@nestjs/common';
import { Role } from '@prisma/client';

export type AuthenticatedUser = {
  id: string;
  email: string;
  role: Role;
  isActive?: boolean;
};

export function assertUserRole(
  user: AuthenticatedUser | undefined,
  expectedRoles: Role[],
): asserts user is AuthenticatedUser {
  if (!user) {
    throw new ForbiddenException('Authenticated user context is missing');
  }

  if (!expectedRoles.includes(user.role)) {
    throw new ForbiddenException(
      `Required role: ${expectedRoles.join(', ')}. Current role: ${user.role}`,
    );
  }
}
