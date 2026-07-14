import { applyDecorators } from '@nestjs/common';
import { ApiQuery } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { ApiModuleTag } from '../../../common/swagger/decorators/api-module-tag.decorator';
import { SWAGGER_MODULES_METADATA } from '../../../common/swagger/swagger.metadata';
import { ApiBearerOperation } from '../../../common/swagger/decorators/api-auth.decorator';
import {
  ApiStandardErrorResponses,
  ApiWrappedOkResponse,
} from '../../../common/swagger/decorators/api-responses.decorator';

export const StatisticsSwagger = {
  Controller() {
    return applyDecorators(
      ApiModuleTag(SWAGGER_MODULES_METADATA.statistics),
    );
  },
  GetTeacherStats() {
    return applyDecorators(
      ApiBearerOperation({
        summary: 'Lấy thống kê cho giáo viên',
        roles: [Role.TEACHER],
      }),
      ApiQuery({ name: 'timeRange', required: false, type: String }),
      ApiWrappedOkResponse({ description: 'Thành công' }),
      ApiStandardErrorResponses(401, 403, 500),
    );
  },
  GetStudentStats() {
    return applyDecorators(
      ApiBearerOperation({
        summary: 'Lấy thống kê cho học sinh',
        roles: [Role.STUDENT],
      }),
      ApiWrappedOkResponse({ description: 'Thành công' }),
      ApiStandardErrorResponses(401, 403, 500),
    );
  },
  GetAdminStats() {
    return applyDecorators(
      ApiBearerOperation({
        summary: 'Lấy thống kê cho quản trị viên',
        roles: [Role.ADMIN],
      }),
      ApiQuery({ name: 'page', required: false, type: String }),
      ApiQuery({ name: 'limit', required: false, type: String }),
      ApiQuery({ name: 'search', required: false, type: String }),
      ApiWrappedOkResponse({ description: 'Thành công' }),
      ApiStandardErrorResponses(401, 403, 500),
    );
  },
  GetTeacherClassStats() {
    return applyDecorators(
      ApiBearerOperation({
        summary: 'Lấy thống kê lớp học của giáo viên',
        roles: [Role.TEACHER],
      }),
      ApiWrappedOkResponse({ description: 'Thành công' }),
      ApiStandardErrorResponses(401, 403, 500),
    );
  },
  GetTeacherLateMissingStudents() {
    return applyDecorators(
      ApiBearerOperation({
        summary: 'Lấy danh sách học sinh nộp muộn/thiếu bài',
        roles: [Role.TEACHER],
      }),
      ApiQuery({ name: 'classId', required: false, type: String }),
      ApiQuery({ name: 'timeRange', required: false, type: String }),
      ApiQuery({ name: 'page', required: false, type: String }),
      ApiQuery({ name: 'limit', required: false, type: String }),
      ApiWrappedOkResponse({ description: 'Thành công' }),
      ApiStandardErrorResponses(401, 403, 500),
    );
  }
};
