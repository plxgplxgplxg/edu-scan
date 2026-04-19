import {
  Controller,
  Get,
  Param,
  Query,
  Res,
  StreamableFile,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import {
  ApiOkResponse,
  ApiParam,
  ApiProduces,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { CurrentUser } from '../../../common/decorators/auth/current-user.decorator';
import { Roles } from '../../../common/decorators/auth/roles.decorator';
import { assertUserRole } from '../../../common/auth/assert-user-role';
import type { AuthenticatedUser } from '../../../common/auth/assert-user-role';
import { JwtAuthGuard } from '../../../common/guards/auth/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/auth/roles.guard';
import { ApiBearerOperation } from '../../../common/swagger/decorators/api-auth.decorator';
import { ApiStandardErrorResponses } from '../../../common/swagger/decorators/api-responses.decorator';
import {
  ExportClassReportQueryDto,
  ReportFormat,
  ReportScope,
} from '../dto/request/export-class-report-query.dto';
import { ReportsService } from '../services/reports.service';

@ApiTags('reports')
@Controller('reports')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.TEACHER)
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('class/:classId')
  @ApiBearerOperation({
    summary: 'Xuất báo cáo lớp học',
    roles: [Role.TEACHER],
    notes:
      'Trả về file nhị phân trực tiếp trong response. `format=xlsx` để xuất Excel, `format=pdf` để xuất PDF. `scope` hiện tại chỉ hỗ trợ `all` theo logic hiện có.',
  })
  @ApiParam({ name: 'classId', description: 'ID lớp học', format: 'uuid' })
  @ApiQuery({
    name: 'format',
    enum: ReportFormat,
    description: 'Định dạng file báo cáo cần xuất',
  })
  @ApiQuery({
    name: 'scope',
    required: false,
    enum: ReportScope,
    description: 'Phạm vi dữ liệu báo cáo',
  })
  @ApiProduces(
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/pdf',
  )
  @ApiOkResponse({
    description: 'File báo cáo được trả về trực tiếp trong response body.',
    schema: {
      type: 'string',
      format: 'binary',
    },
  })
  @ApiStandardErrorResponses(400, 401, 403, 404, 500)
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
