import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { assertUserRole } from '../../common/auth/assert-user-role';
import type { AuthenticatedUser } from '../../common/auth/assert-user-role';
import { CurrentUser } from '../../common/decorators/auth/current-user.decorator';
import { Roles } from '../../common/decorators/auth/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/auth/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/auth/roles.guard';
import { StatisticsService } from './services/statistics.service';
import { StatisticsSwagger } from './docs/statistics.swagger';

@StatisticsSwagger.Controller()
@Controller('stats')
@UseGuards(JwtAuthGuard, RolesGuard)
export class StatisticsController {
  constructor(private readonly statisticsService: StatisticsService) {}

  @Get('teacher')
  @StatisticsSwagger.GetTeacherStats()
  @Roles(Role.TEACHER)
  async getTeacherStats(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Query('timeRange') timeRange?: string,
  ) {
    assertUserRole(currentUser, [Role.TEACHER]);
    return this.statisticsService.getTeacherStats(currentUser.id, timeRange);
  }

  @Get('student')
  @StatisticsSwagger.GetStudentStats()
  @Roles(Role.STUDENT)
  async getStudentStats(@CurrentUser() currentUser: AuthenticatedUser) {
    assertUserRole(currentUser, [Role.STUDENT]);
    return this.statisticsService.getStudentStats(currentUser.id);
  }

  @Get('admin')
  @StatisticsSwagger.GetAdminStats()
  @Roles(Role.ADMIN)
  async getAdminStats(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
  ) {
    assertUserRole(currentUser, [Role.ADMIN]);
    return this.statisticsService.getAdminStats({
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      search,
    });
  }

  @Get('teacher/class/:classId')
  @StatisticsSwagger.GetTeacherClassStats()
  @Roles(Role.TEACHER)
  async getTeacherClassStats(
    @Param('classId') classId: string,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    assertUserRole(currentUser, [Role.TEACHER]);
    return this.statisticsService.getTeacherClassStats(currentUser.id, classId);
  }

  @Get('teacher/late-missing')
  @StatisticsSwagger.GetTeacherLateMissingStudents()
  @Roles(Role.TEACHER)
  async getTeacherLateMissingStudents(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Query('classId') classId?: string,
    @Query('timeRange') timeRange?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    assertUserRole(currentUser, [Role.TEACHER]);
    return this.statisticsService.getTeacherLateMissingStudents(
      currentUser.id,
      {
        classId,
        timeRange,
        page: page ? parseInt(page, 10) : undefined,
        limit: limit ? parseInt(limit, 10) : undefined,
      },
    );
  }

  @Get('profile')
  @Roles(Role.TEACHER, Role.STUDENT, Role.ADMIN)
  async getProfileStats(@CurrentUser() currentUser: AuthenticatedUser) {
    return this.statisticsService.getProfileStats(
      currentUser.id,
      currentUser.role,
    );
  }
}
