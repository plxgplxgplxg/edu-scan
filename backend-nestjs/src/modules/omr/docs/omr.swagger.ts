import { applyDecorators } from '@nestjs/common';
import { ApiBody, ApiConsumes, ApiParam } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { ApiModuleTag } from '../../../common/swagger/decorators/api-module-tag.decorator';
import { ApiBearerOperation } from '../../../common/swagger/decorators/api-auth.decorator';
import {
  ApiStandardErrorResponses,
  ApiWrappedCreatedResponse,
  ApiWrappedOkResponse,
} from '../../../common/swagger/decorators/api-responses.decorator';
import { SWAGGER_MODULES_METADATA } from '../../../common/swagger/swagger.metadata';
import {
  OmrBatchResponseDto,
  OmrSubmissionDetailViewResponseDto,
} from '../dto/response/omr-batch-response.dto';

export const OmrSwagger = {
  Controller() {
    return ApiModuleTag(SWAGGER_MODULES_METADATA.omr);
  },
  TaiLenBatchOmr() {
    return applyDecorators(
      ApiBearerOperation({
        summary: 'Tải lên batch ảnh OMR cho một đề thi',
        roles: [Role.TEACHER],
        notes:
          'Gửi `multipart/form-data`. Trường `files` chấp nhận tối đa 50 tệp trong một batch tải lên.',
      }),
      ApiConsumes('multipart/form-data'),
      ApiBody({
        schema: {
          type: 'object',
          required: ['examId', 'files'],
          properties: {
            examId: { type: 'string', format: 'uuid', description: 'ID đề thi' },
            templateName: {
              type: 'string',
              nullable: true,
              description: 'Tên mẫu nhận diện OMR nếu có',
            },
            files: {
              type: 'array',
              items: { type: 'string', format: 'binary' },
              description: 'Danh sách ảnh phiếu trả lời OMR',
            },
          },
        },
      }),
      ApiWrappedCreatedResponse({
        type: OmrBatchResponseDto,
        description: 'Tạo batch tải lên OMR thành công.',
      }),
      ApiStandardErrorResponses(400, 401, 403, 404, 500),
    );
  },
  LayChiTietBatchOmr() {
    return applyDecorators(
      ApiBearerOperation({
        summary: 'Lấy chi tiết batch OMR',
        roles: [Role.TEACHER],
        notes:
          'Trả về trạng thái batch, số lượng tệp, thống kê xử lý và danh sách bài làm được sinh từ batch.',
      }),
      ApiParam({ name: 'batchId', description: 'ID batch OMR', format: 'uuid' }),
      ApiWrappedOkResponse({
        type: OmrBatchResponseDto,
        description: 'Lấy chi tiết batch OMR thành công.',
      }),
      ApiStandardErrorResponses(401, 403, 404, 500),
    );
  },
  LayChiTietBaiLamOmr() {
    return applyDecorators(
      ApiBearerOperation({
        summary: 'Lấy chi tiết bài làm OMR',
        roles: [Role.TEACHER],
        notes:
          'Dùng để xem kết quả nhận dạng, mã đề được resolve, đáp án từng câu và các tệp ảnh liên quan.',
      }),
      ApiParam({
        name: 'submissionId',
        description: 'ID bài làm OMR',
        format: 'uuid',
      }),
      ApiWrappedOkResponse({
        type: OmrSubmissionDetailViewResponseDto,
        description: 'Lấy chi tiết bài làm OMR thành công.',
      }),
      ApiStandardErrorResponses(401, 403, 404, 500),
    );
  },
};
