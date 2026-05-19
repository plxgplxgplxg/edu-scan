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
};
