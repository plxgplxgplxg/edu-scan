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
    summary: 'Tao assignment moi',
    roles: [Role.TEACHER],
  })
  @ApiBody({ type: CreateAssignmentDto })
  @ApiWrappedCreatedResponse({
    type: AssignmentResponseDto,
    description: 'Tao assignment thanh cong.',
  })
  @ApiStandardErrorResponses(400, 401, 403, 500)
  create(@Body() dto: CreateAssignmentDto, @Req() req: AssignmentRequest) {
    return this.assignmentsService.createAssignment(req.user.id, dto);
  }

  @Get()
  @Roles(Role.TEACHER, Role.STUDENT)
  @ApiBearerOperation({
    summary: 'Lay danh sach assignment theo vai tro hien tai',
    roles: [Role.TEACHER, Role.STUDENT],
    notes:
      'TEACHER nhan danh sach assignment cua minh kem _count.submits. STUDENT nhan assignment duoc giao kem submits cua chinh minh.',
  })
  @ApiWrappedOkResponse({
    type: AssignmentResponseDto,
    isArray: true,
    description: 'Lay danh sach assignment thanh cong.',
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
    summary: 'Lay danh sach bai nop cua assignment',
    roles: [Role.TEACHER],
  })
  @ApiParam({ name: 'id', description: 'Assignment id', format: 'uuid' })
  @ApiWrappedOkResponse({
    type: AssignmentSubmitResponseDto,
    isArray: true,
    description: 'Lay danh sach bai nop thanh cong.',
  })
  @ApiStandardErrorResponses(401, 403, 404, 500)
  getSubmits(@Param('id') id: string, @Req() req: AssignmentRequest) {
    return this.assignmentsService.getSubmitsForTeacher(id, req.user.id);
  }

  @Post(':id/submits')
  @Roles(Role.STUDENT)
  @ApiBearerOperation({
    summary: 'Hoc sinh nop bai assignment',
    roles: [Role.STUDENT],
  })
  @ApiParam({ name: 'id', description: 'Assignment id', format: 'uuid' })
  @ApiBody({ type: SubmitAssignmentDto })
  @ApiWrappedCreatedResponse({
    type: AssignmentSubmitResponseDto,
    description: 'Nop bai assignment thanh cong.',
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
    summary: 'Lay bai nop cua hoc sinh hien tai cho assignment',
    roles: [Role.STUDENT],
  })
  @ApiParam({ name: 'id', description: 'Assignment id', format: 'uuid' })
  @ApiWrappedOkResponse({
    type: AssignmentSubmitResponseDto,
    description: 'Lay bai nop cua hoc sinh thanh cong.',
  })
  @ApiStandardErrorResponses(401, 403, 404, 500)
  getMySubmit(@Param('id') id: string, @Req() req: AssignmentRequest) {
    return this.assignmentsService.getMySubmit(id, req.user.id);
  }

  @Patch(':id/submits/:submitId/grade')
  @Roles(Role.TEACHER)
  @ApiBearerOperation({
    summary: 'Cham diem bai nop assignment',
    roles: [Role.TEACHER],
  })
  @ApiParam({ name: 'id', description: 'Assignment id', format: 'uuid' })
  @ApiParam({
    name: 'submitId',
    description: 'Assignment submit id',
    format: 'uuid',
  })
  @ApiBody({ type: GradeSubmitDto })
  @ApiWrappedOkResponse({
    type: AssignmentSubmitResponseDto,
    description: 'Cham diem bai nop thanh cong.',
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
