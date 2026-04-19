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
    summary: 'Tạo đề thi mới',
    roles: [Role.TEACHER],
    notes:
      'Giáo viên tạo đề thi, gán cho lớp học, cấu hình mã đề, đáp án và sơ đồ câu hỏi. Không được gửi đồng thời `answerKeys` legacy và `variants` trong cùng request.',
  })
  @ApiBody({ type: CreateExamDto })
  @ApiWrappedCreatedResponse({
    type: ExamResponseDto,
    description: 'Tạo đề thi thành công.',
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
    summary: 'Lấy danh sách đề thi của giáo viên',
    roles: [Role.TEACHER],
  })
  @ApiWrappedOkResponse({
    type: ExamResponseDto,
    isArray: true,
    description: 'Lấy danh sách đề thi thành công.',
  })
  @ApiStandardErrorResponses(401, 403, 500)
  async listTeacherExams(@CurrentUser('id') teacherId: string) {
    return this.examsService.listTeacherExams(teacherId);
  }

  @Get(':id')
  @ApiBearerOperation({
    summary: 'Lấy chi tiết đề thi',
    roles: [Role.TEACHER],
    notes:
      'Trả về đầy đủ thông tin đề thi, bao gồm lớp áp dụng, danh sách mã đề, đáp án và question map nếu có.',
  })
  @ApiParam({ name: 'id', description: 'ID đề thi', format: 'uuid' })
  @ApiWrappedOkResponse({
    type: ExamResponseDto,
    description: 'Lấy chi tiết đề thi thành công.',
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
    summary: 'Cập nhật đề thi',
    roles: [Role.TEACHER],
    notes:
      'Nếu đề thi đã có submissions hoặc OMR batches, service sẽ chặn thay đổi `classIds`, `variants`, `answerKeys` và `questionMap` để bảo toàn dữ liệu chấm bài.',
  })
  @ApiParam({ name: 'id', description: 'ID đề thi', format: 'uuid' })
  @ApiBody({ type: UpdateExamDto })
  @ApiWrappedOkResponse({
    type: ExamResponseDto,
    description: 'Cập nhật đề thi thành công.',
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
    summary: 'Xóa đề thi',
    roles: [Role.TEACHER],
    notes:
      'Chỉ được xóa khi đề thi chưa phát sinh submissions và chưa có batch OMR liên quan.',
  })
  @ApiParam({ name: 'id', description: 'ID đề thi', format: 'uuid' })
  @ApiWrappedOkResponse({
    type: DeleteExamResponseDto,
    description: 'Xóa đề thi thành công.',
  })
  @ApiStandardErrorResponses(400, 401, 403, 404, 500)
  async deleteExam(
    @Param('id') examId: string,
    @CurrentUser('id') teacherId: string,
  ) {
    return this.examsService.deleteExam(examId, teacherId);
  }
}
