import { applyDecorators } from '@nestjs/common';
import { ApiBody, ApiParam, ApiQuery } from '@nestjs/swagger';
import { Difficulty, Role } from '@prisma/client';
import { ApiModuleTag } from '../../../common/swagger/decorators/api-module-tag.decorator';
import { ApiBearerOperation } from '../../../common/swagger/decorators/api-auth.decorator';
import {
  ApiStandardErrorResponses,
  ApiWrappedCreatedResponse,
  ApiWrappedOkResponse,
} from '../../../common/swagger/decorators/api-responses.decorator';
import { SWAGGER_MODULES_METADATA } from '../../../common/swagger/swagger.metadata';
import { CreateQuestionDto } from '../dtos/create-question.dto';
import { QuestionSortBy, SortOrder } from '../dtos/query-questions.dto';
import {
  DeleteQuestionResponseDto,
  QuestionListResponseDto,
  QuestionResponseDto,
} from '../dtos/question-response.dto';
import { UpdateQuestionDto } from '../dtos/update-question.dto';

export const QuestionsSwagger = {
  Controller() {
    return ApiModuleTag(SWAGGER_MODULES_METADATA.questions);
  },
  TaoCauHoi() {
    return applyDecorators(
      ApiBearerOperation({
        summary: 'Tạo câu hỏi mới trong ngân hàng câu hỏi',
        roles: [Role.TEACHER],
      }),
      ApiBody({ type: CreateQuestionDto }),
      ApiWrappedCreatedResponse({
        type: QuestionResponseDto,
        description: 'Tạo câu hỏi thành công.',
      }),
      ApiStandardErrorResponses(400, 401, 403, 500),
    );
  },
  LayDanhSachCauHoi() {
    return applyDecorators(
      ApiBearerOperation({
        summary: 'Lấy danh sách câu hỏi của giáo viên',
        roles: [Role.TEACHER],
        notes:
          'Hỗ trợ phân trang, lọc theo môn học, độ khó, tag, từ khóa và sắp xếp kết quả.',
      }),
      ApiQuery({
        name: 'page',
        required: false,
        type: Number,
        description: 'Số trang hiện tại',
      }),
      ApiQuery({
        name: 'limit',
        required: false,
        type: Number,
        description: 'Số lượng phần tử trên mỗi trang',
      }),
      ApiQuery({
        name: 'subject',
        required: false,
        type: String,
        description: 'Lọc theo môn học',
      }),
      ApiQuery({
        name: 'difficulty',
        required: false,
        enum: Difficulty,
        description: 'Lọc theo độ khó câu hỏi',
      }),
      ApiQuery({
        name: 'tags',
        required: false,
        type: String,
        description:
          'Danh sách tag, hỗ trợ dạng chuỗi phân tách bằng dấu phẩy hoặc lặp lại query parameter',
      }),
      ApiQuery({
        name: 'keyword',
        required: false,
        type: String,
        description: 'Từ khóa tìm kiếm',
      }),
      ApiQuery({
        name: 'sortBy',
        required: false,
        enum: QuestionSortBy,
        description: 'Trường dùng để sắp xếp',
      }),
      ApiQuery({
        name: 'sortOrder',
        required: false,
        enum: SortOrder,
        description: 'Thứ tự sắp xếp tăng hoặc giảm',
      }),
      ApiWrappedOkResponse({
        type: QuestionListResponseDto,
        description: 'Lấy danh sách câu hỏi thành công.',
      }),
      ApiStandardErrorResponses(400, 401, 403, 500),
    );
  },
  LayChiTietCauHoi() {
    return applyDecorators(
      ApiBearerOperation({
        summary: 'Lấy chi tiết câu hỏi',
        roles: [Role.TEACHER],
      }),
      ApiParam({ name: 'id', description: 'ID câu hỏi', format: 'uuid' }),
      ApiWrappedOkResponse({
        type: QuestionResponseDto,
        description: 'Lấy chi tiết câu hỏi thành công.',
      }),
      ApiStandardErrorResponses(401, 403, 404, 500),
    );
  },
  CapNhatCauHoi() {
    return applyDecorators(
      ApiBearerOperation({
        summary: 'Cập nhật câu hỏi',
        roles: [Role.TEACHER],
      }),
      ApiParam({ name: 'id', description: 'ID câu hỏi', format: 'uuid' }),
      ApiBody({ type: UpdateQuestionDto }),
      ApiWrappedOkResponse({
        type: QuestionResponseDto,
        description: 'Cập nhật câu hỏi thành công.',
      }),
      ApiStandardErrorResponses(400, 401, 403, 404, 500),
    );
  },
  XoaCauHoi() {
    return applyDecorators(
      ApiBearerOperation({
        summary: 'Xóa câu hỏi',
        roles: [Role.TEACHER],
      }),
      ApiParam({ name: 'id', description: 'ID câu hỏi', format: 'uuid' }),
      ApiWrappedOkResponse({
        type: DeleteQuestionResponseDto,
        description: 'Xóa câu hỏi thành công.',
      }),
      ApiStandardErrorResponses(401, 403, 404, 500),
    );
  },
};
