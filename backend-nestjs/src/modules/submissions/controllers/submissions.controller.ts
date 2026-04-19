import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ApiBody, ApiParam, ApiQuery, ApiTags } from '@nestjs/swagger';
import {
  Role,
  SubmissionStatus,
  TestCodeResolutionStatus,
} from '@prisma/client';
import { Roles } from '../../../common/decorators/auth/roles.decorator';
import { JwtAuthGuard } from '../../../common/guards/auth/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/auth/roles.guard';
import { ApiBearerOperation } from '../../../common/swagger/decorators/api-auth.decorator';
import {
  ApiStandardErrorResponses,
  ApiWrappedOkResponse,
} from '../../../common/swagger/decorators/api-responses.decorator';
import { GetSubmissionsQueryDto } from '../dtos/get-submissions-query.dto';
import { QueryMySubmissionsDto } from '../dtos/query-my-submissions.dto';
import {
  StudentSubmissionListResponseDto,
  StudentSubmissionProgressItemResponseDto,
  SubmissionDetailResponseDto,
  SubmissionListItemResponseDto,
} from '../dtos/response/submission-response.dto';
import { UpdateSubmissionOverrideDto } from '../dtos/update-override.dto';
import { SubmissionsService } from '../services/submissions.service';

type RequestUser = { id: string; role: string };
type AuthenticatedRequest = { user: RequestUser };

@ApiTags('submissions')
@Controller('submissions')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SubmissionsController {
  constructor(private readonly submissionsService: SubmissionsService) {}

  @Get()
  @Roles(Role.ADMIN, Role.TEACHER)
  @ApiBearerOperation({
    summary: 'Lay danh sach submissions',
    roles: [Role.ADMIN, Role.TEACHER],
    notes:
      'TEACHER va ADMIN co the loc theo examId, classId, batchId, studentId, status va testCodeResolutionStatus.',
  })
  @ApiQuery({ name: 'examId', required: false, type: String })
  @ApiQuery({ name: 'classId', required: false, type: String })
  @ApiQuery({ name: 'batchId', required: false, type: String })
  @ApiQuery({ name: 'studentId', required: false, type: String })
  @ApiQuery({ name: 'status', required: false, enum: SubmissionStatus })
  @ApiQuery({
    name: 'testCodeResolutionStatus',
    required: false,
    enum: TestCodeResolutionStatus,
  })
  @ApiWrappedOkResponse({
    type: SubmissionListItemResponseDto,
    isArray: true,
    description: 'Lay danh sach submissions thanh cong.',
  })
  @ApiStandardErrorResponses(401, 403, 500)
  findAll(@Query() query: GetSubmissionsQueryDto) {
    return this.submissionsService.findAll(query);
  }

  @Get('me')
  @Roles(Role.STUDENT)
  @ApiBearerOperation({
    summary: 'Lay danh sach submissions cua sinh vien hien tai',
    roles: [Role.STUDENT],
  })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'classId', required: false, type: String })
  @ApiQuery({ name: 'examId', required: false, type: String })
  @ApiQuery({ name: 'status', required: false, enum: SubmissionStatus })
  @ApiWrappedOkResponse({
    type: StudentSubmissionListResponseDto,
    description: 'Lay danh sach submissions cua sinh vien thanh cong.',
  })
  @ApiStandardErrorResponses(400, 401, 403, 500)
  findMySubmissions(
    @Request() req: AuthenticatedRequest,
    @Query() query: QueryMySubmissionsDto,
  ) {
    return this.submissionsService.findMySubmissions(req.user, query);
  }

  @Get('me/progress')
  @Roles(Role.STUDENT)
  @ApiBearerOperation({
    summary: 'Lay du lieu tien do diem so cua sinh vien hien tai',
    roles: [Role.STUDENT],
  })
  @ApiWrappedOkResponse({
    type: StudentSubmissionProgressItemResponseDto,
    isArray: true,
    description: 'Lay du lieu tien do thanh cong.',
  })
  @ApiStandardErrorResponses(401, 403, 500)
  getMyProgress(@Request() req: AuthenticatedRequest) {
    return this.submissionsService.getMyProgress(req.user);
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.TEACHER, Role.STUDENT)
  @ApiBearerOperation({
    summary: 'Lay chi tiet submission',
    roles: [Role.ADMIN, Role.TEACHER, Role.STUDENT],
    notes:
      'STUDENT chi xem duoc submission cua chinh minh. TEACHER/ADMIN xem duoc du lieu chi tiet kem score da tinh.',
  })
  @ApiParam({ name: 'id', description: 'Submission id', format: 'uuid' })
  @ApiWrappedOkResponse({
    type: SubmissionDetailResponseDto,
    description: 'Lay chi tiet submission thanh cong.',
  })
  @ApiStandardErrorResponses(401, 403, 404, 500)
  findOne(@Param('id') id: string, @Request() req: AuthenticatedRequest) {
    return this.submissionsService.findOneWithScore(id, req.user);
  }

  @Patch(':id/override')
  @Roles(Role.ADMIN, Role.TEACHER)
  @ApiBearerOperation({
    summary: 'Override thu cong submission',
    roles: [Role.ADMIN, Role.TEACHER],
    notes:
      'Cho phep cap nhat studentCode, resolvedTestCode, resolvedVariantId va finalAnswer theo tung question.',
  })
  @ApiParam({ name: 'id', description: 'Submission id', format: 'uuid' })
  @ApiBody({ type: UpdateSubmissionOverrideDto })
  @ApiWrappedOkResponse({
    type: SubmissionDetailResponseDto,
    description: 'Override submission thanh cong.',
  })
  @ApiStandardErrorResponses(400, 401, 403, 404, 500)
  manualOverride(
    @Param('id') id: string,
    @Body() dto: UpdateSubmissionOverrideDto,
  ) {
    return this.submissionsService.manualOverride(id, dto);
  }
}
