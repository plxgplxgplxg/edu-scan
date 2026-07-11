import { applyDecorators } from '@nestjs/common';
import { ApiBody, ApiParam } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { ApiModuleTag } from '../../../common/swagger/decorators/api-module-tag.decorator';
import { ApiBearerOperation } from '../../../common/swagger/decorators/api-auth.decorator';
import {
  ApiStandardErrorResponses,
  ApiWrappedCreatedResponse,
  ApiWrappedOkResponse,
} from '../../../common/swagger/decorators/api-responses.decorator';
import { SWAGGER_MODULES_METADATA } from '../../../common/swagger/swagger.metadata';
import { CreateExamDto } from '../dto/request/create-exam.dto';
import { UpdateExamDto } from '../dto/request/update-exam.dto';
import {
  DeleteExamResponseDto,
  ExamResponseDto,
  PaginatedExamResponseDto,
} from '../dto/response/exam-response.dto';
import { ApiQuery } from '@nestjs/swagger';

export const ExamsSwagger = {
  Controller() {
    return ApiModuleTag(SWAGGER_MODULES_METADATA.exams);
  },
  TaoDeThi() {
    return applyDecorators(
      ApiBearerOperation({
        summary: 'Tạo đề thi mới',
        roles: [Role.TEACHER],
        notes:
          'Giáo viên tạo đề kiểm tra trắc nghiệm, gán cho lớp học, cấu hình mã đề và đáp án. Không được gửi đồng thời `answerKeys` legacy và `variants` trong cùng request.',
      }),
      ApiBody({ type: CreateExamDto }),
      ApiWrappedCreatedResponse({
        type: ExamResponseDto,
        description: 'Tạo đề thi thành công.',
      }),
      ApiStandardErrorResponses(400, 401, 403, 500),
    );
  },
  LayDanhSachDeThiCuaToi() {
    return applyDecorators(
      ApiBearerOperation({
        summary: 'Lấy danh sách đề thi của giáo viên',
        roles: [Role.TEACHER],
      }),
      ApiQuery({ name: 'page', required: false, type: Number }),
      ApiQuery({ name: 'limit', required: false, type: Number }),
      ApiQuery({ name: 'keyword', required: false, type: String }),
      ApiWrappedOkResponse({
        type: PaginatedExamResponseDto,
        description: 'Lấy danh sách đề thi thành công.',
      }),
      ApiStandardErrorResponses(401, 403, 500),
    );
  },
  LayChiTietDeThi() {
    return applyDecorators(
      ApiBearerOperation({
        summary: 'Lấy chi tiết đề thi',
        roles: [Role.TEACHER],
        notes:
          'Trả về đầy đủ thông tin đề kiểm tra, bao gồm lớp áp dụng, danh sách mã đề và đáp án.',
      }),
      ApiParam({ name: 'id', description: 'ID đề thi', format: 'uuid' }),
      ApiWrappedOkResponse({
        type: ExamResponseDto,
        description: 'Lấy chi tiết đề thi thành công.',
      }),
      ApiStandardErrorResponses(401, 403, 404, 500),
    );
  },
  CapNhatDeThi() {
    return applyDecorators(
      ApiBearerOperation({
        summary: 'Cập nhật đề thi',
        roles: [Role.TEACHER],
        notes:
          'Nếu đề thi đã có bài làm hoặc đợt chấm bài, service sẽ chặn thay đổi `classIds`, `variants` và `answerKeys` để bảo toàn dữ liệu chấm bài.',
      }),
      ApiParam({ name: 'id', description: 'ID đề thi', format: 'uuid' }),
      ApiBody({ type: UpdateExamDto }),
      ApiWrappedOkResponse({
        type: ExamResponseDto,
        description: 'Cập nhật đề thi thành công.',
      }),
      ApiStandardErrorResponses(400, 401, 403, 404, 500),
    );
  },
  XoaDeThi() {
    return applyDecorators(
      ApiBearerOperation({
        summary: 'Xóa đề thi',
        roles: [Role.TEACHER],
        notes:
          'Chỉ được xóa khi đề thi chưa phát sinh bài làm và chưa có đợt chấm bài liên quan.',
      }),
      ApiParam({ name: 'id', description: 'ID đề thi', format: 'uuid' }),
      ApiWrappedOkResponse({
        type: DeleteExamResponseDto,
        description: 'Xóa đề thi thành công.',
      }),
      ApiStandardErrorResponses(400, 401, 403, 404, 500),
    );
  },
  LayDanhSachBaiLamCuaDeThi() {
    return applyDecorators(
      ApiBearerOperation({
        summary: 'Lấy danh sách bài làm của đề thi',
        roles: [Role.TEACHER],
      }),
      ApiParam({ name: 'id', description: 'ID đề thi', format: 'uuid' }),
      ApiQuery({ name: 'page', required: false, type: Number }),
      ApiQuery({ name: 'limit', required: false, type: Number }),
      ApiQuery({ name: 'keyword', required: false, type: String }),
      ApiQuery({ name: 'sortScore', required: false, enum: ['asc', 'desc'] }),
      ApiQuery({ name: 'variantCode', required: false, type: String }),
      ApiWrappedOkResponse({
        description: 'Lấy danh sách bài làm thành công.',
      }),
      ApiStandardErrorResponses(401, 403, 404, 500),
    );
  },
};
