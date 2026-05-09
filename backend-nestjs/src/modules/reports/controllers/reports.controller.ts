import {
  Controller,
  Get,
  Param,
  Query,
  Res,
  StreamableFile,
  UseGuards,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import type { Response } from 'express';
import { assertUserRole } from '../../../common/auth/assert-user-role';
import type { AuthenticatedUser } from '../../../common/auth/assert-user-role';
import { CurrentUser } from '../../../common/decorators/auth/current-user.decorator';
import { Roles } from '../../../common/decorators/auth/roles.decorator';
import { JwtAuthGuard } from '../../../common/guards/auth/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/auth/roles.guard';
import { ReportsSwagger } from '../docs/reports.swagger';
import {
  ExportClassReportQueryDto,
  ReportScope,
} from '../dto/request/export-class-report-query.dto';
import { ReportsService } from '../services/reports.service';

@ReportsSwagger.Controller()
@Controller('reports')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.TEACHER)
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('class/:classId')
  @ReportsSwagger.XuatBaoCaoLopHoc()
  async exportClassReport(
    @Param('classId') classId: string,
    @Query() query: ExportClassReportQueryDto,
    @CurrentUser() currentUser: AuthenticatedUser,
    @Res({ passthrough: true }) response: Response,
  ) {
    assertUserRole(currentUser, [Role.TEACHER]);

    const output = await this.reportsService.exportClassReport({
      classId,
      teacherId: currentUser.id,
      format: query.format,
      scope: query.scope ?? ReportScope.ALL,
    });

    response.setHeader('Content-Type', output.mimeType);
    response.setHeader(
      'Content-Disposition',
      `attachment; filename="${output.fileName}"`,
    );

    return new StreamableFile(output.buffer);
  }
}
