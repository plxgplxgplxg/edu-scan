import { applyDecorators } from '@nestjs/common';
import { ApiBody, ApiParam, ApiQuery } from '@nestjs/swagger';
import { RemarkStatus, Role } from '@prisma/client';
import { ApiModuleTag } from '../../../common/swagger/decorators/api-module-tag.decorator';
import { ApiBearerOperation } from '../../../common/swagger/decorators/api-auth.decorator';
import {
  ApiStandardErrorResponses,
  ApiWrappedCreatedResponse,
  ApiWrappedOkResponse,
} from '../../../common/swagger/decorators/api-responses.decorator';
import { SWAGGER_MODULES_METADATA } from '../../../common/swagger/swagger.metadata';
import { CreateRemarkRequestDto } from '../dtos/create-remark.dto';
import { RemarkResponseDto } from '../dtos/response/remark-response.dto';
import { ReviewRemarkRequestDto } from '../dtos/review-remark.dto';

export const RemarksSwagger = {
  Controller() {
    return ApiModuleTag(SWAGGER_MODULES_METADATA.remarks);
  },
  TaoYeuCauPhucKhao() {
    return applyDecorators(
      ApiBearerOperation({
        summary: 'Học sinh tạo yêu cầu phúc khảo',
        roles: [Role.STUDENT],
        notes:
          'Học sinh gửi yêu cầu phúc khảo cho một bài làm hoặc một câu hỏi cụ thể theo dữ liệu trong request body.',
      }),
      ApiBody({ type: CreateRemarkRequestDto }),
      ApiWrappedCreatedResponse({
        type: RemarkResponseDto,
        description: 'Tạo yêu cầu phúc khảo thành công.',
      }),
      ApiStandardErrorResponses(400, 401, 403, 404, 409, 500),
    );
  },
  LayDanhSachYeuCauPhucKhao() {
    return applyDecorators(
      ApiBearerOperation({
        summary: 'Lấy danh sách yêu cầu phúc khảo',
        roles: [Role.TEACHER, Role.ADMIN],
        notes:
          'Giáo viên và quản trị viên có thể lọc theo trạng thái để theo dõi luồng xử lý phúc khảo.',
      }),
      ApiQuery({
        name: 'status',
        required: false,
        enum: RemarkStatus,
        description: 'Lọc yêu cầu phúc khảo theo trạng thái xử lý',
      }),
      ApiWrappedOkResponse({
        type: RemarkResponseDto,
        isArray: true,
        description: 'Lấy danh sách yêu cầu phúc khảo thành công.',
      }),
      ApiStandardErrorResponses(401, 403, 500),
    );
  },
  DuyetYeuCauPhucKhao() {
    return applyDecorators(
      ApiBearerOperation({
        summary: 'Duyệt yêu cầu phúc khảo',
        roles: [Role.TEACHER, Role.ADMIN],
        notes:
          'Khi `APPROVED` cần cung cấp `finalAnswer`. Khi `REJECTED` cần cung cấp `teacherComment` theo business rule hiện tại.',
      }),
      ApiParam({
        name: 'id',
        description: 'ID yêu cầu phúc khảo',
        format: 'uuid',
      }),
      ApiBody({ type: ReviewRemarkRequestDto }),
      ApiWrappedOkResponse({
        type: RemarkResponseDto,
        description: 'Duyệt yêu cầu phúc khảo thành công.',
      }),
      ApiStandardErrorResponses(400, 401, 403, 404, 409, 500),
    );
  },
};
