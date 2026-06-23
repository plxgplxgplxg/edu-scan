import {
  Controller,
  Get,
  MessageEvent,
  Param,
  Post,
  Query,
  Res,
  Sse,
  StreamableFile,
  UseGuards,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import type { Response } from 'express';
import { map, type Observable } from 'rxjs';
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
import { ReportExportJobService } from '../services/report-export-job.service';
import {
  buildReportExportSseChannelId,
  type ReportExportSseEvent,
} from '../sse/report-export-sse-event';
import { SseRegistryService } from '../../omr/services/sse-registry.service';

@ReportsSwagger.Controller()
@Controller('reports')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.TEACHER)
export class ReportsController {
  constructor(
    private readonly reportsService: ReportsService,
    private readonly reportExportJobService: ReportExportJobService,
    private readonly sseRegistryService: SseRegistryService<ReportExportSseEvent>,
  ) {}

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

  @Post('class/:classId/jobs')
  @ReportsSwagger.TaoJobXuatBaoCao()
  async createExportJob(
    @Param('classId') classId: string,
    @Query() query: ExportClassReportQueryDto,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    assertUserRole(currentUser, [Role.TEACHER]);

    return this.reportExportJobService.createJob({
      classId,
      teacherId: currentUser.id,
      format: query.format,
      scope: query.scope,
    });
  }

  @Get('jobs/:jobId')
  @ReportsSwagger.LayTrangThaiJobXuatBaoCao()
  getExportJob(
    @Param('jobId') jobId: string,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    assertUserRole(currentUser, [Role.TEACHER]);
    return this.reportExportJobService.getJob(jobId, currentUser.id);
  }

  @Get('jobs/:jobId/file')
  @ReportsSwagger.TaiFileBaoCaoTheoJob()
  async downloadExportedFile(
    @Param('jobId') jobId: string,
    @CurrentUser() currentUser: AuthenticatedUser,
    @Res({ passthrough: true }) response: Response,
  ) {
    assertUserRole(currentUser, [Role.TEACHER]);

    const output = this.reportExportJobService.getCompletedFile(
      jobId,
      currentUser.id,
    );

    response.setHeader('Content-Type', output.mimeType);
    response.setHeader(
      'Content-Disposition',
      `attachment; filename="${output.fileName}"`,
    );

    return new StreamableFile(output.buffer);
  }

  @Sse('sse/:jobId')
  @ReportsSwagger.TheoDoiJobXuatBaoCao()
  streamExportJob(
    @Param('jobId') jobId: string,
    @CurrentUser() currentUser: AuthenticatedUser,
  ): Observable<MessageEvent> {
    assertUserRole(currentUser, [Role.TEACHER]);
    this.reportExportJobService.getJob(jobId, currentUser.id);

    return this.sseRegistryService
      .stream(buildReportExportSseChannelId(jobId))
      .pipe(map((event) => ({ type: event.type, data: event })));
  }
}
