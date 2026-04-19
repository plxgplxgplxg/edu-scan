import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBody, ApiParam, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { Roles } from '../../../common/decorators/auth/roles.decorator';
import { JwtAuthGuard } from '../../../common/guards/auth/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/auth/roles.guard';
import { ApiBearerOperation } from '../../../common/swagger/decorators/api-auth.decorator';
import {
  ApiStandardErrorResponses,
  ApiWrappedCreatedResponse,
  ApiWrappedOkResponse,
} from '../../../common/swagger/decorators/api-responses.decorator';
import { CreateAssignmentDto } from '../dtos/create-assignment.dto';
import { GradeSubmitDto } from '../dtos/grade-submit.dto';
import {
  AssignmentResponseDto,
  AssignmentSubmitResponseDto,
} from '../dtos/response/assignment-response.dto';
import { SubmitAssignmentDto } from '../dtos/submit-assignment.dto';
import { AssignmentsService } from '../services/assignments.service';

type AssignmentRequestUser = {
  id: string;
  role: Role;
};

type AssignmentRequest = {
  user: AssignmentRequestUser;
};

@ApiTags('assignments')
@Controller('assignments')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AssignmentsController {
  constructor(private readonly assignmentsService: AssignmentsService) {}

  @Post()
  @Roles(Role.TEACHER)
  @ApiBearerOperation({
    summary: 'Tạo bài tập mới',
    roles: [Role.TEACHER],
    notes:
      'Giáo viên tạo bài tập, hạn nộp và cấu hình chấm điểm cho học sinh trong lớp.',
  })
  @ApiBody({ type: CreateAssignmentDto })
  @ApiWrappedCreatedResponse({
    type: AssignmentResponseDto,
    description: 'Tạo bài tập thành công.',
  })
  @ApiStandardErrorResponses(400, 401, 403, 500)
  create(@Body() dto: CreateAssignmentDto, @Req() req: AssignmentRequest) {
    return this.assignmentsService.createAssignment(req.user.id, dto);
  }

  @Get()
  @Roles(Role.TEACHER, Role.STUDENT)
  @ApiBearerOperation({
    summary: 'Lấy danh sách bài tập theo vai trò hiện tại',
    roles: [Role.TEACHER, Role.STUDENT],
    notes:
      'TEACHER nhận danh sách bài tập mình tạo kèm thống kê số lượt nộp. STUDENT nhận danh sách bài tập được giao kèm bài nộp của chính mình nếu đã nộp.',
  })
  @ApiWrappedOkResponse({
    type: AssignmentResponseDto,
    isArray: true,
    description: 'Lấy danh sách bài tập thành công.',
  })
  @ApiStandardErrorResponses(401, 403, 500)
  findAll(@Req() req: AssignmentRequest) {
    if (req.user.role === Role.TEACHER) {
      return this.assignmentsService.listAssignmentsForTeacher(req.user.id);
    }
    return this.assignmentsService.listAssignmentsForStudent(req.user.id);
  }

  @Get(':id/submits')
  @Roles(Role.TEACHER)
  @ApiBearerOperation({
    summary: 'Lấy danh sách bài nộp của bài tập',
    roles: [Role.TEACHER],
    notes:
      'Giáo viên dùng endpoint này để xem toàn bộ bài nộp thuộc một bài tập cụ thể.',
  })
  @ApiParam({ name: 'id', description: 'ID bài tập', format: 'uuid' })
  @ApiWrappedOkResponse({
    type: AssignmentSubmitResponseDto,
    isArray: true,
    description: 'Lấy danh sách bài nộp thành công.',
  })
  @ApiStandardErrorResponses(401, 403, 404, 500)
  getSubmits(@Param('id') id: string, @Req() req: AssignmentRequest) {
    return this.assignmentsService.getSubmitsForTeacher(id, req.user.id);
  }

  @Post(':id/submits')
  @Roles(Role.STUDENT)
  @ApiBearerOperation({
    summary: 'Học sinh nộp bài tập',
    roles: [Role.STUDENT],
    notes:
      'Học sinh nộp bài cho đúng bài tập theo `id`. Dữ liệu nộp phải tuân theo cấu trúc của `SubmitAssignmentDto`.',
  })
  @ApiParam({ name: 'id', description: 'ID bài tập', format: 'uuid' })
  @ApiBody({ type: SubmitAssignmentDto })
  @ApiWrappedCreatedResponse({
    type: AssignmentSubmitResponseDto,
    description: 'Nộp bài tập thành công.',
  })
  @ApiStandardErrorResponses(400, 401, 403, 404, 500)
  submit(
    @Param('id') id: string,
    @Body() dto: SubmitAssignmentDto,
    @Req() req: AssignmentRequest,
  ) {
    return this.assignmentsService.submitAssignment(id, req.user.id, dto);
  }

  @Get(':id/submits/me')
  @Roles(Role.STUDENT)
  @ApiBearerOperation({
    summary: 'Lấy bài nộp của học sinh hiện tại cho bài tập',
    roles: [Role.STUDENT],
  })
  @ApiParam({ name: 'id', description: 'ID bài tập', format: 'uuid' })
  @ApiWrappedOkResponse({
    type: AssignmentSubmitResponseDto,
    description: 'Lấy bài nộp của học sinh thành công.',
  })
  @ApiStandardErrorResponses(401, 403, 404, 500)
  getMySubmit(@Param('id') id: string, @Req() req: AssignmentRequest) {
    return this.assignmentsService.getMySubmit(id, req.user.id);
  }

  @Patch(':id/submits/:submitId/grade')
  @Roles(Role.TEACHER)
  @ApiBearerOperation({
    summary: 'Chấm điểm bài nộp',
    roles: [Role.TEACHER],
    notes:
      'Giáo viên cập nhật điểm và nhận xét cho một bài nộp cụ thể của học sinh.',
  })
  @ApiParam({ name: 'id', description: 'ID bài tập', format: 'uuid' })
  @ApiParam({
    name: 'submitId',
    description: 'ID bài nộp',
    format: 'uuid',
  })
  @ApiBody({ type: GradeSubmitDto })
  @ApiWrappedOkResponse({
    type: AssignmentSubmitResponseDto,
    description: 'Chấm điểm bài nộp thành công.',
  })
  @ApiStandardErrorResponses(400, 401, 403, 404, 500)
  grade(
    @Param('id') id: string,
    @Param('submitId') submitId: string,
    @Body() dto: GradeSubmitDto,
    @Req() req: AssignmentRequest,
  ) {
    return this.assignmentsService.gradeSubmit(id, submitId, req.user.id, dto);
  }
}
