import { applyDecorators } from '@nestjs/common';
import { ApiBody, ApiParam, ApiQuery } from '@nestjs/swagger';
import {
  Role,
  SubmissionStatus,
  TestCodeResolutionStatus,
} from '@prisma/client';
import { ApiModuleTag } from '../../../common/swagger/decorators/api-module-tag.decorator';
import { ApiBearerOperation } from '../../../common/swagger/decorators/api-auth.decorator';
import {
  ApiStandardErrorResponses,
  ApiWrappedOkResponse,
} from '../../../common/swagger/decorators/api-responses.decorator';
import { SWAGGER_MODULES_METADATA } from '../../../common/swagger/swagger.metadata';
import {
  StudentSubmissionListResponseDto,
  StudentSubmissionProgressItemResponseDto,
  SubmissionDetailResponseDto,
  SubmissionListItemResponseDto,
} from '../dtos/response/submission-response.dto';
import { UpdateSubmissionOverrideDto } from '../dtos/update-override.dto';
import { UpdateSubmissionDetailDto } from '../dtos/update-submission-detail.dto';

export const SubmissionsSwagger = {
  Controller() {
    return ApiModuleTag(SWAGGER_MODULES_METADATA.submissions);
  },
  LayDanhSachBaiLam() {
    return applyDecorators(
      ApiBearerOperation({
        summary: 'Lấy danh sách bài làm',
        roles: [Role.ADMIN, Role.TEACHER],
        notes:
          'Quản trị viên và giáo viên có thể lọc theo `examId`, `classId`, `batchId`, `studentId`, `status` và `testCodeResolutionStatus` để phục vụ tra cứu và rà soát chấm bài.',
      }),
      ApiQuery({
        name: 'examId',
        required: false,
        type: String,
        description: 'Lọc theo ID đề thi',
      }),
      ApiQuery({
        name: 'classId',
        required: false,
        type: String,
        description: 'Lọc theo ID lớp học',
      }),
      ApiQuery({
        name: 'batchId',
        required: false,
        type: String,
        description: 'Lọc theo ID batch OMR',
      }),
      ApiQuery({
        name: 'studentId',
        required: false,
        type: String,
        description: 'Lọc theo ID học sinh',
      }),
      ApiQuery({
        name: 'status',
        required: false,
        enum: SubmissionStatus,
        description: 'Lọc theo trạng thái bài làm',
      }),
      ApiQuery({
        name: 'testCodeResolutionStatus',
        required: false,
        enum: TestCodeResolutionStatus,
        description: 'Lọc theo trạng thái nhận diện mã đề',
      }),
      ApiWrappedOkResponse({
        type: SubmissionListItemResponseDto,
        isArray: true,
        description: 'Lấy danh sách bài làm thành công.',
      }),
      ApiStandardErrorResponses(401, 403, 500),
    );
  },
  LayDanhSachBaiLamCuaToi() {
    return applyDecorators(
      ApiBearerOperation({
        summary: 'Lấy danh sách bài làm của học sinh hiện tại',
        roles: [Role.STUDENT],
        notes:
          'Chỉ trả về bài làm của chính học sinh đang đăng nhập, có hỗ trợ phân trang và lọc theo lớp, đề thi, trạng thái.',
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
        name: 'classId',
        required: false,
        type: String,
        description: 'Lọc theo ID lớp học',
      }),
      ApiQuery({
        name: 'examId',
        required: false,
        type: String,
        description: 'Lọc theo ID đề thi',
      }),
      ApiQuery({
        name: 'status',
        required: false,
        enum: SubmissionStatus,
        description: 'Lọc theo trạng thái bài làm',
      }),
      ApiWrappedOkResponse({
        type: StudentSubmissionListResponseDto,
        description: 'Lấy danh sách bài làm của học sinh thành công.',
      }),
      ApiStandardErrorResponses(400, 401, 403, 500),
    );
  },
  LayTienDoCuaToi() {
    return applyDecorators(
      ApiBearerOperation({
        summary: 'Lấy dữ liệu tiến độ điểm số của học sinh hiện tại',
        roles: [Role.STUDENT],
        notes:
          'Dùng để hiển thị tiến độ làm bài và tổng quan kết quả theo thời gian của học sinh hiện tại.',
      }),
      ApiWrappedOkResponse({
        type: StudentSubmissionProgressItemResponseDto,
        isArray: true,
        description: 'Lấy dữ liệu tiến độ thành công.',
      }),
      ApiStandardErrorResponses(401, 403, 500),
    );
  },
  LayChiTietBaiLam() {
    return applyDecorators(
      ApiBearerOperation({
        summary: 'Lấy chi tiết bài làm',
        roles: [Role.ADMIN, Role.TEACHER, Role.STUDENT],
        notes:
          'Học sinh chỉ xem được bài làm của chính mình. Giáo viên và quản trị viên được xem dữ liệu chi tiết, đáp án từng câu và điểm đã tính.',
      }),
      ApiParam({ name: 'id', description: 'ID bài làm', format: 'uuid' }),
      ApiWrappedOkResponse({
        type: SubmissionDetailResponseDto,
        description: 'Lấy chi tiết bài làm thành công.',
      }),
      ApiStandardErrorResponses(401, 403, 404, 500),
    );
  },
  OverrideThuCongBaiLam() {
    return applyDecorators(
      ApiBearerOperation({
        summary: 'Override thủ công bài làm',
        roles: [Role.ADMIN, Role.TEACHER],
        notes:
          'Cho phép cập nhật `studentCode`, `resolvedTestCode`, `resolvedVariantId` và `finalAnswer` theo từng câu khi cần xử lý ngoại lệ thủ công.',
      }),
      ApiParam({ name: 'id', description: 'ID bài làm', format: 'uuid' }),
      ApiBody({ type: UpdateSubmissionOverrideDto }),
      ApiWrappedOkResponse({
        type: SubmissionDetailResponseDto,
        description: 'Override bài làm thành công.',
      }),
      ApiStandardErrorResponses(400, 401, 403, 404, 500),
    );
  },
  CapNhatChiTietBaiLam() {
    return applyDecorators(
      ApiBearerOperation({
        summary: 'Cập nhật đáp án chi tiết của bài làm',
        roles: [Role.ADMIN, Role.TEACHER],
      }),
      ApiParam({ name: 'id', description: 'ID bài làm', format: 'uuid' }),
      ApiParam({ name: 'questionNumber', description: 'Số thứ tự câu hỏi' }),
      ApiBody({ type: UpdateSubmissionDetailDto }),
      ApiWrappedOkResponse({
        description: 'Cập nhật chi tiết bài làm thành công.',
      }),
      ApiStandardErrorResponses(400, 401, 403, 404, 500),
    );
  },
};
