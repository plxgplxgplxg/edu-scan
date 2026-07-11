import { applyDecorators } from '@nestjs/common';
import {
  ApiOkResponse,
  ApiParam,
  ApiProduces,
  ApiQuery,
} from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { ApiModuleTag } from '../../../common/swagger/decorators/api-module-tag.decorator';
import { ApiBearerOperation } from '../../../common/swagger/decorators/api-auth.decorator';
import { ApiStandardErrorResponses } from '../../../common/swagger/decorators/api-responses.decorator';
import { SWAGGER_MODULES_METADATA } from '../../../common/swagger/swagger.metadata';
import {
  ReportFormat,
  ReportScope,
} from '../dto/request/export-class-report-query.dto';
import { ReportExportJobResponseDto } from '../dto/response/report-export-job-response.dto';
import {
  ApiWrappedCreatedResponse,
  ApiWrappedOkResponse,
} from '../../../common/swagger/decorators/api-responses.decorator';

export const ReportsSwagger = {
  Controller() {
    return ApiModuleTag(SWAGGER_MODULES_METADATA.reports);
  },
  XuatBaoCaoLopHoc() {
    return applyDecorators(
      ApiBearerOperation({
        summary: 'Xuất báo cáo lớp học',
        roles: [Role.TEACHER],
        notes:
          'Trả về tệp nhị phân trực tiếp trong response. `format=xlsx` để xuất Excel, `format=pdf` để xuất PDF. `scope` hiện tại chỉ hỗ trợ `all` theo logic đang có.',
      }),
      ApiParam({ name: 'classId', description: 'ID lớp học', format: 'uuid' }),
      ApiQuery({
        name: 'format',
        enum: ReportFormat,
        description: 'Định dạng tệp báo cáo cần xuất',
      }),
      ApiQuery({
        name: 'scope',
        required: false,
        enum: ReportScope,
        description: 'Phạm vi dữ liệu báo cáo',
      }),
      ApiProduces(
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/pdf',
      ),
      ApiOkResponse({
        description: 'Tệp báo cáo được trả về trực tiếp trong response body.',
        schema: {
          type: 'string',
          format: 'binary',
        },
      }),
      ApiStandardErrorResponses(400, 401, 403, 404, 500),
    );
  },
  TaoJobXuatBaoCao() {
    return applyDecorators(
      ApiBearerOperation({
        summary: 'Tạo job xuất báo cáo lớp học bất đồng bộ',
        roles: [Role.TEACHER],
        notes:
          'Tạo một export job và theo dõi tiến độ qua SSE tại `/reports/sse/:jobId`. Khi job hoàn tất, tải file tại `/reports/jobs/:jobId/file`.',
      }),
      ApiParam({ name: 'classId', description: 'ID lớp học', format: 'uuid' }),
      ApiQuery({
        name: 'format',
        enum: ReportFormat,
        description: 'Định dạng tệp báo cáo cần xuất',
      }),
      ApiQuery({
        name: 'scope',
        required: false,
        enum: ReportScope,
        description: 'Phạm vi dữ liệu báo cáo',
      }),
      ApiWrappedCreatedResponse({
        type: ReportExportJobResponseDto,
        description: 'Tạo job xuất báo cáo thành công.',
      }),
      ApiStandardErrorResponses(400, 401, 403, 404, 500),
    );
  },
  LayTrangThaiJobXuatBaoCao() {
    return applyDecorators(
      ApiBearerOperation({
        summary: 'Lấy trạng thái job xuất báo cáo',
        roles: [Role.TEACHER],
      }),
      ApiParam({ name: 'jobId', description: 'ID job export', format: 'uuid' }),
      ApiWrappedOkResponse({
        type: ReportExportJobResponseDto,
        description: 'Lấy trạng thái job xuất báo cáo thành công.',
      }),
      ApiStandardErrorResponses(401, 403, 404, 500),
    );
  },
  TaiFileBaoCaoTheoJob() {
    return applyDecorators(
      ApiBearerOperation({
        summary: 'Tải tệp báo cáo sau khi job hoàn tất',
        roles: [Role.TEACHER],
      }),
      ApiParam({ name: 'jobId', description: 'ID job export', format: 'uuid' }),
      ApiProduces(
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/pdf',
      ),
      ApiOkResponse({
        description: 'Tệp báo cáo được trả về trực tiếp trong response body.',
        schema: {
          type: 'string',
          format: 'binary',
        },
      }),
      ApiStandardErrorResponses(400, 401, 403, 404, 500),
    );
  },
  TheoDoiJobXuatBaoCao() {
    return applyDecorators(
      ApiBearerOperation({
        summary: 'Theo dõi job xuất báo cáo qua SSE',
        roles: [Role.TEACHER],
        notes:
          'Mở kết nối `text/event-stream` để nhận các event `report:queued`, `report:processing`, `report:completed`, `report:failed`.',
      }),
      ApiParam({ name: 'jobId', description: 'ID job export', format: 'uuid' }),
      ApiProduces('text/event-stream'),
      ApiOkResponse({
        description: 'Luồng SSE trạng thái job xuất báo cáo.',
        schema: {
          type: 'string',
          example:
            'event: report:processing\\ndata: {"type":"report:processing","jobId":"uuid","classId":"uuid","format":"xlsx","scope":"all"}\\n\\n',
        },
      }),
      ApiStandardErrorResponses(401, 403, 404, 500),
    );
  },
};
