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
    summary: 'Lấy danh sách bài làm',
    roles: [Role.ADMIN, Role.TEACHER],
    notes:
      'ADMIN và TEACHER có thể lọc theo `examId`, `classId`, `batchId`, `studentId`, `status` và `testCodeResolutionStatus` để phục vụ tra cứu và rà soát chấm bài.',
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
    description: 'Lấy danh sách bài làm thành công.',
  })
  @ApiStandardErrorResponses(401, 403, 500)
  findAll(@Query() query: GetSubmissionsQueryDto) {
    return this.submissionsService.findAll(query);
  }

  @Get('me')
  @Roles(Role.STUDENT)
  @ApiBearerOperation({
    summary: 'Lấy danh sách bài làm của học sinh hiện tại',
    roles: [Role.STUDENT],
    notes:
      'Chỉ trả về bài làm của chính học sinh đang đăng nhập, có hỗ trợ phân trang và lọc theo lớp, đề thi, trạng thái.',
  })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'classId', required: false, type: String })
  @ApiQuery({ name: 'examId', required: false, type: String })
  @ApiQuery({ name: 'status', required: false, enum: SubmissionStatus })
  @ApiWrappedOkResponse({
    type: StudentSubmissionListResponseDto,
    description: 'Lấy danh sách bài làm của học sinh thành công.',
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
    summary: 'Lấy dữ liệu tiến độ điểm số của học sinh hiện tại',
    roles: [Role.STUDENT],
    notes:
      'Dùng để hiển thị tiến độ làm bài và tổng quan kết quả theo thời gian của học sinh hiện tại.',
  })
  @ApiWrappedOkResponse({
    type: StudentSubmissionProgressItemResponseDto,
    isArray: true,
    description: 'Lấy dữ liệu tiến độ thành công.',
  })
  @ApiStandardErrorResponses(401, 403, 500)
  getMyProgress(@Request() req: AuthenticatedRequest) {
    return this.submissionsService.getMyProgress(req.user);
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.TEACHER, Role.STUDENT)
  @ApiBearerOperation({
    summary: 'Lấy chi tiết bài làm',
    roles: [Role.ADMIN, Role.TEACHER, Role.STUDENT],
    notes:
      'STUDENT chỉ xem được bài làm của chính mình. TEACHER và ADMIN được xem dữ liệu chi tiết, đáp án từng câu và điểm đã tính.',
  })
  @ApiParam({ name: 'id', description: 'ID bài làm', format: 'uuid' })
  @ApiWrappedOkResponse({
    type: SubmissionDetailResponseDto,
    description: 'Lấy chi tiết bài làm thành công.',
  })
  @ApiStandardErrorResponses(401, 403, 404, 500)
  findOne(@Param('id') id: string, @Request() req: AuthenticatedRequest) {
    return this.submissionsService.findOneWithScore(id, req.user);
  }

  @Patch(':id/override')
  @Roles(Role.ADMIN, Role.TEACHER)
  @ApiBearerOperation({
    summary: 'Override thủ công bài làm',
    roles: [Role.ADMIN, Role.TEACHER],
    notes:
      'Cho phép cập nhật `studentCode`, `resolvedTestCode`, `resolvedVariantId` và `finalAnswer` theo từng câu khi cần xử lý ngoại lệ thủ công.',
  })
  @ApiParam({ name: 'id', description: 'ID bài làm', format: 'uuid' })
  @ApiBody({ type: UpdateSubmissionOverrideDto })
  @ApiWrappedOkResponse({
    type: SubmissionDetailResponseDto,
    description: 'Override bài làm thành công.',
  })
  @ApiStandardErrorResponses(400, 401, 403, 404, 500)
  manualOverride(
    @Param('id') id: string,
    @Body() dto: UpdateSubmissionOverrideDto,
  ) {
    return this.submissionsService.manualOverride(id, dto);
  }
}
