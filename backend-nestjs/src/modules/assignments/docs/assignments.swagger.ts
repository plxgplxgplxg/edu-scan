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
import { CreateAssignmentDto } from '../dtos/create-assignment.dto';
import { GradeSubmitDto } from '../dtos/grade-submit.dto';
import {
  AssignmentResponseDto,
  AssignmentSubmitResponseDto,
} from '../dtos/response/assignment-response.dto';
import { SubmitAssignmentDto } from '../dtos/submit-assignment.dto';

export const AssignmentsSwagger = {
  Controller() {
    return ApiModuleTag(SWAGGER_MODULES_METADATA.assignments);
  },
  TaoBaiTap() {
    return applyDecorators(
      ApiBearerOperation({
        summary: 'Tạo bài tập mới',
        roles: [Role.TEACHER],
        notes:
          'Giáo viên tạo bài tập, hạn nộp và cấu hình chấm điểm cho học sinh trong lớp.',
      }),
      ApiBody({ type: CreateAssignmentDto }),
      ApiWrappedCreatedResponse({
        type: AssignmentResponseDto,
        description: 'Tạo bài tập thành công.',
      }),
      ApiStandardErrorResponses(400, 401, 403, 500),
    );
  },
  LayDanhSachBaiTap() {
    return applyDecorators(
      ApiBearerOperation({
        summary: 'Lấy danh sách bài tập theo vai trò hiện tại',
        roles: [Role.TEACHER, Role.STUDENT],
        notes:
          'Giáo viên nhận danh sách bài tập mình tạo kèm thống kê số lượt nộp. Học sinh nhận danh sách bài tập được giao kèm bài nộp của chính mình nếu đã nộp.',
      }),
      ApiWrappedOkResponse({
        type: AssignmentResponseDto,
        isArray: true,
        description: 'Lấy danh sách bài tập thành công.',
      }),
      ApiStandardErrorResponses(401, 403, 500),
    );
  },
  LayDanhSachBaiNop() {
    return applyDecorators(
      ApiBearerOperation({
        summary: 'Lấy danh sách bài nộp của bài tập',
        roles: [Role.TEACHER],
        notes:
          'Giáo viên dùng endpoint này để xem toàn bộ bài nộp thuộc một bài tập cụ thể.',
      }),
      ApiParam({ name: 'id', description: 'ID bài tập', format: 'uuid' }),
      ApiWrappedOkResponse({
        type: AssignmentSubmitResponseDto,
        isArray: true,
        description: 'Lấy danh sách bài nộp thành công.',
      }),
      ApiStandardErrorResponses(401, 403, 404, 500),
    );
  },
  NopBaiTap() {
    return applyDecorators(
      ApiBearerOperation({
        summary: 'Học sinh nộp bài tập',
        roles: [Role.STUDENT],
        notes:
          'Học sinh nộp bài cho đúng bài tập theo `id`. Dữ liệu nộp phải tuân theo cấu trúc của `SubmitAssignmentDto`.',
      }),
      ApiParam({ name: 'id', description: 'ID bài tập', format: 'uuid' }),
      ApiBody({ type: SubmitAssignmentDto }),
      ApiWrappedCreatedResponse({
        type: AssignmentSubmitResponseDto,
        description: 'Nộp bài tập thành công.',
      }),
      ApiStandardErrorResponses(400, 401, 403, 404, 500),
    );
  },
  LayBaiNopCuaToi() {
    return applyDecorators(
      ApiBearerOperation({
        summary: 'Lấy bài nộp của học sinh hiện tại cho bài tập',
        roles: [Role.STUDENT],
      }),
      ApiParam({ name: 'id', description: 'ID bài tập', format: 'uuid' }),
      ApiWrappedOkResponse({
        type: AssignmentSubmitResponseDto,
        description: 'Lấy bài nộp của học sinh thành công.',
      }),
      ApiStandardErrorResponses(401, 403, 404, 500),
    );
  },
  ChamDiemBaiNop() {
    return applyDecorators(
      ApiBearerOperation({
        summary: 'Chấm điểm bài nộp',
        roles: [Role.TEACHER],
        notes:
          'Giáo viên cập nhật điểm và nhận xét cho một bài nộp cụ thể của học sinh.',
      }),
      ApiParam({ name: 'id', description: 'ID bài tập', format: 'uuid' }),
      ApiParam({ name: 'submitId', description: 'ID bài nộp', format: 'uuid' }),
      ApiBody({ type: GradeSubmitDto }),
      ApiWrappedOkResponse({
        type: AssignmentSubmitResponseDto,
        description: 'Chấm điểm bài nộp thành công.',
      }),
      ApiStandardErrorResponses(400, 401, 403, 404, 500),
    );
  },
};
