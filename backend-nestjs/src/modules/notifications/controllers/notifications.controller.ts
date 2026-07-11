import { Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import type { AuthenticatedUser } from '../../../common/auth/assert-user-role';
import { assertUserRole } from '../../../common/auth/assert-user-role';
import { CurrentUser } from '../../../common/decorators/auth/current-user.decorator';
import { Roles } from '../../../common/decorators/auth/roles.decorator';
import { JwtAuthGuard } from '../../../common/guards/auth/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/auth/roles.guard';
import { NotificationsService } from '../services/notifications.service';

@Controller('notifications')
@UseGuards(JwtAuthGuard, RolesGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @Roles(Role.TEACHER, Role.STUDENT, Role.ADMIN)
  list(@CurrentUser() currentUser: AuthenticatedUser) {
    assertUserRole(currentUser, [Role.TEACHER, Role.STUDENT, Role.ADMIN]);
    return this.notificationsService.listForUser(currentUser.id);
  }

  @Patch(':id/read')
  @Roles(Role.TEACHER, Role.STUDENT, Role.ADMIN)
  markAsRead(
    @Param('id') notificationId: string,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    assertUserRole(currentUser, [Role.TEACHER, Role.STUDENT, Role.ADMIN]);
    return this.notificationsService.markAsRead(notificationId, currentUser.id);
  }

  @Patch('read-all')
  @Roles(Role.TEACHER, Role.STUDENT, Role.ADMIN)
  markAllAsRead(@CurrentUser() currentUser: AuthenticatedUser) {
    assertUserRole(currentUser, [Role.TEACHER, Role.STUDENT, Role.ADMIN]);
    return this.notificationsService.markAllAsRead(currentUser.id);
  }
}
