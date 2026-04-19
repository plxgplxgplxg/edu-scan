import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBody, ApiParam, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { CurrentUser } from '../../../common/decorators/auth/current-user.decorator';
import { Roles } from '../../../common/decorators/auth/roles.decorator';
import { JwtAuthGuard } from '../../../common/guards/auth/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/auth/roles.guard';
import { ApiBearerOperation } from '../../../common/swagger/decorators/api-auth.decorator';
import {
  ApiStandardErrorResponses,
  ApiWrappedCreatedResponse,
  ApiWrappedOkResponse,
} from '../../../common/swagger/decorators/api-responses.decorator';
import { CreateExamDto } from '../dto/request/create-exam.dto';
import { UpdateExamDto } from '../dto/request/update-exam.dto';
import {
  DeleteExamResponseDto,
  ExamResponseDto,
} from '../dto/response/exam-response.dto';
import { ExamsService } from '../services/exams.service';

@ApiTags('exams')
@Controller('exams')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.TEACHER)
export class ExamsController {
  constructor(private readonly examsService: ExamsService) {}

  @Post()
  @ApiBearerOperation({
    summary: 'Tao de thi moi',
    roles: [Role.TEACHER],
    notes:
      'Teacher tao exam, gan cho class, variants, answer keys va question map. Khong duoc gui ca answerKeys legacy va variants cung luc.',
  })
  @ApiBody({ type: CreateExamDto })
  @ApiWrappedCreatedResponse({
    type: ExamResponseDto,
    description: 'Tao de thi thanh cong.',
  })
  @ApiStandardErrorResponses(400, 401, 403, 500)
  async createExam(
    @CurrentUser('id') teacherId: string,
    @Body() createExamDto: CreateExamDto,
  ) {
    return this.examsService.createExam(teacherId, createExamDto);
  }

  @Get('my')
  @ApiBearerOperation({
    summary: 'Lay danh sach de thi cua giao vien',
    roles: [Role.TEACHER],
  })
  @ApiWrappedOkResponse({
    type: ExamResponseDto,
    isArray: true,
    description: 'Lay danh sach de thi thanh cong.',
  })
  @ApiStandardErrorResponses(401, 403, 500)
  async listTeacherExams(@CurrentUser('id') teacherId: string) {
    return this.examsService.listTeacherExams(teacherId);
  }

  @Get(':id')
  @ApiBearerOperation({
    summary: 'Lay chi tiet de thi',
    roles: [Role.TEACHER],
  })
  @ApiParam({ name: 'id', description: 'Exam id', format: 'uuid' })
  @ApiWrappedOkResponse({
    type: ExamResponseDto,
    description: 'Lay chi tiet de thi thanh cong.',
  })
  @ApiStandardErrorResponses(401, 403, 404, 500)
  async getTeacherExamById(
    @Param('id') examId: string,
    @CurrentUser('id') teacherId: string,
  ) {
    return this.examsService.getTeacherExamById(examId, teacherId);
  }

  @Patch(':id')
  @ApiBearerOperation({
    summary: 'Cap nhat de thi',
    roles: [Role.TEACHER],
    notes:
      'Neu exam da co submissions hoac OMR batches, service se chan thay doi classIds, variants, answer keys va questionMap.',
  })
  @ApiParam({ name: 'id', description: 'Exam id', format: 'uuid' })
  @ApiBody({ type: UpdateExamDto })
  @ApiWrappedOkResponse({
    type: ExamResponseDto,
    description: 'Cap nhat de thi thanh cong.',
  })
  @ApiStandardErrorResponses(400, 401, 403, 404, 500)
  async updateExam(
    @Param('id') examId: string,
    @CurrentUser('id') teacherId: string,
    @Body() updateExamDto: UpdateExamDto,
  ) {
    return this.examsService.updateExam(examId, teacherId, updateExamDto);
  }

  @Delete(':id')
  @ApiBearerOperation({
    summary: 'Xoa de thi',
    roles: [Role.TEACHER],
    notes: 'Chi xoa duoc khi exam chua co submissions va chua co OMR batches.',
  })
  @ApiParam({ name: 'id', description: 'Exam id', format: 'uuid' })
  @ApiWrappedOkResponse({
    type: DeleteExamResponseDto,
    description: 'Xoa de thi thanh cong.',
  })
  @ApiStandardErrorResponses(400, 401, 403, 404, 500)
  async deleteExam(
    @Param('id') examId: string,
    @CurrentUser('id') teacherId: string,
  ) {
    return this.examsService.deleteExam(examId, teacherId);
  }
}
