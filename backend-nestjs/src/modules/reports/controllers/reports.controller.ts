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
    summary: 'Export bao cao lop hoc',
    roles: [Role.TEACHER],
    notes:
      'Tra ve file nhi phan. format=xlsx cho Excel, format=pdf cho PDF. scope hien tai chi ho tro all trong DTO.',
  })
  @ApiParam({ name: 'classId', description: 'Class id', format: 'uuid' })
  @ApiQuery({ name: 'format', enum: ReportFormat })
  @ApiQuery({ name: 'scope', required: false, enum: ReportScope })
  @ApiProduces(
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/pdf',
  )
  @ApiOkResponse({
    description: 'File report duoc tra ve truc tiep trong response body.',
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
