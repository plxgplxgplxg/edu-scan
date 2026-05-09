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
import { AddStudentDto } from '../dto/request/add-student.dto';
import { CreateClassDto } from '../dto/request/create-class.dto';
import { UpdateClassDto } from '../dto/request/update-class.dto';
import { ClassResponseDto } from '../dto/response/class-response.dto';

export const ClassesSwagger = {
  Controller() {
    return ApiModuleTag(SWAGGER_MODULES_METADATA.classes);
  },
  TaoLopHoc() {
    return applyDecorators(
      ApiBearerOperation({
        summary: 'Tạo lớp học mới',
        roles: [Role.TEACHER],
        notes:
          'Giáo viên tạo lớp học mới và hệ thống sinh mã lớp để học sinh tham gia.',
      }),
      ApiBody({ type: CreateClassDto }),
      ApiWrappedCreatedResponse({
        type: ClassResponseDto,
        description: 'Tạo lớp học thành công.',
      }),
      ApiStandardErrorResponses(400, 401, 403, 500),
    );
  },
  LayDanhSachLopHocCuaToi() {
    return applyDecorators(
      ApiBearerOperation({
        summary: 'Lấy danh sách lớp học của giáo viên hiện tại',
        roles: [Role.TEACHER],
      }),
      ApiWrappedOkResponse({
        type: ClassResponseDto,
        isArray: true,
        description: 'Lấy danh sách lớp học thành công.',
      }),
      ApiStandardErrorResponses(401, 403, 500),
    );
  },
  LayDanhSachLopHocTheoVaiTro() {
    return applyDecorators(
      ApiBearerOperation({
        summary: 'Lấy danh sách lớp học theo vai trò hiện tại',
        roles: [Role.TEACHER, Role.STUDENT, Role.ADMIN],
        notes:
          'TEACHER nhận danh sách lớp đang dạy, STUDENT nhận danh sách lớp đã tham gia, ADMIN nhận toàn bộ lớp học.',
      }),
      ApiWrappedOkResponse({
        type: ClassResponseDto,
        isArray: true,
        description: 'Lấy danh sách lớp học thành công.',
      }),
      ApiStandardErrorResponses(401, 403, 500),
    );
  },
  LayChiTietLopHoc() {
    return applyDecorators(
      ApiBearerOperation({
        summary: 'Lấy chi tiết lớp học theo ID',
        roles: [Role.TEACHER, Role.STUDENT, Role.ADMIN],
        notes:
          'TEACHER xem lớp mình phụ trách, STUDENT xem lớp mình đã tham gia, ADMIN xem mọi lớp. Trả về thông tin lớp, giáo viên phụ trách và danh sách học sinh đã ghi danh.',
      }),
      ApiParam({ name: 'id', description: 'ID lớp học', format: 'uuid' }),
      ApiWrappedOkResponse({
        type: ClassResponseDto,
        description: 'Lấy chi tiết lớp học thành công.',
      }),
      ApiStandardErrorResponses(401, 403, 404, 500),
    );
  },
  CapNhatLopHoc() {
    return applyDecorators(
      ApiBearerOperation({
        summary: 'Cập nhật thông tin lớp học',
        roles: [Role.TEACHER],
      }),
      ApiParam({ name: 'id', description: 'ID lớp học', format: 'uuid' }),
      ApiBody({ type: UpdateClassDto }),
      ApiWrappedOkResponse({
        type: ClassResponseDto,
        description: 'Cập nhật lớp học thành công.',
      }),
      ApiStandardErrorResponses(400, 401, 403, 404, 500),
    );
  },
  ThemHocSinh() {
    return applyDecorators(
      ApiBearerOperation({
        summary: 'Thêm học sinh vào lớp học',
        roles: [Role.TEACHER],
        notes:
          'Học sinh có thể được xác định bằng `email`, `studentId` hoặc `studentCode`. Chỉ cần cung cấp một định danh hợp lệ.',
      }),
      ApiParam({ name: 'id', description: 'ID lớp học', format: 'uuid' }),
      ApiBody({ type: AddStudentDto }),
      ApiWrappedOkResponse({
        type: ClassResponseDto,
        description: 'Thêm học sinh vào lớp thành công.',
      }),
      ApiStandardErrorResponses(400, 401, 403, 404, 500),
    );
  },
  XoaHocSinh() {
    return applyDecorators(
      ApiBearerOperation({
        summary: 'Xóa học sinh khỏi lớp học',
        roles: [Role.TEACHER],
      }),
      ApiParam({ name: 'id', description: 'ID lớp học', format: 'uuid' }),
      ApiParam({
        name: 'studentId',
        description: 'ID học sinh',
        format: 'uuid',
      }),
      ApiWrappedOkResponse({
        type: ClassResponseDto,
        description: 'Xóa học sinh khỏi lớp thành công.',
      }),
      ApiStandardErrorResponses(400, 401, 403, 404, 500),
    );
  },
  ThamGiaLopBangMa() {
    return applyDecorators(
      ApiBearerOperation({
        summary: 'Học sinh tham gia lớp bằng mã lớp',
        roles: [Role.STUDENT],
        notes:
          'Mã lớp được giáo viên tạo sẵn. Học sinh sẽ được thêm vào danh sách ghi danh của lớp nếu mã hợp lệ.',
      }),
      ApiParam({ name: 'code', description: 'Mã tham gia lớp học' }),
      ApiWrappedOkResponse({
        type: ClassResponseDto,
        description: 'Tham gia lớp thành công.',
      }),
      ApiStandardErrorResponses(400, 401, 403, 404, 500),
    );
  },
};
