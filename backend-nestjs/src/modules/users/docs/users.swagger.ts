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
import { CreateUserDto } from '../dto/request/create-user.dto';
import { UpdateUserDto } from '../dto/request/update-user.dto';
import { UserResponseDto } from '../dto/response/user-response.dto';

export const UsersSwagger = {
  Controller() {
    return ApiModuleTag(SWAGGER_MODULES_METADATA.users);
  },
  LayDanhSachNguoiDung() {
    return applyDecorators(
      ApiBearerOperation({
        summary: 'Lấy danh sách người dùng',
        roles: [Role.ADMIN],
        notes:
          'Chỉ quản trị viên được phép xem toàn bộ tài khoản cùng vai trò, mã học sinh và trạng thái kích hoạt hiện tại.',
      }),
      ApiWrappedOkResponse({
        type: UserResponseDto,
        isArray: true,
        description: 'Lấy danh sách người dùng thành công.',
      }),
      ApiStandardErrorResponses(401, 403, 500),
    );
  },
  LayChiTietNguoiDung() {
    return applyDecorators(
      ApiBearerOperation({
        summary: 'Lấy chi tiết người dùng theo ID',
        roles: [Role.ADMIN],
        notes:
          'Dùng để tra cứu chi tiết một tài khoản cụ thể theo khóa định danh UUID.',
      }),
      ApiParam({ name: 'id', description: 'ID người dùng', format: 'uuid' }),
      ApiWrappedOkResponse({
        type: UserResponseDto,
        description: 'Lấy chi tiết người dùng thành công.',
      }),
      ApiStandardErrorResponses(401, 403, 404, 500),
    );
  },
  TaoNguoiDung() {
    return applyDecorators(
      ApiBearerOperation({
        summary: 'Tạo người dùng mới',
        roles: [Role.ADMIN],
        notes:
          'Quản trị viên có thể tạo tài khoản quản trị viên, giáo viên hoặc học sinh. `studentCode` là bắt buộc khi role là STUDENT.',
      }),
      ApiBody({ type: CreateUserDto }),
      ApiWrappedCreatedResponse({
        type: UserResponseDto,
        description: 'Tạo người dùng thành công.',
      }),
      ApiStandardErrorResponses(400, 401, 403, 409, 500),
    );
  },
  CapNhatNguoiDung() {
    return applyDecorators(
      ApiBearerOperation({
        summary: 'Cập nhật thông tin người dùng',
        roles: [Role.ADMIN],
        notes:
          'Quản trị viên có thể đổi vai trò, thông tin tài khoản và trạng thái kích hoạt. `studentCode` phải hợp lệ nếu tài khoản là STUDENT.',
      }),
      ApiParam({ name: 'id', description: 'ID người dùng', format: 'uuid' }),
      ApiBody({ type: UpdateUserDto }),
      ApiWrappedOkResponse({
        type: UserResponseDto,
        description: 'Cập nhật người dùng thành công.',
      }),
      ApiStandardErrorResponses(400, 401, 403, 404, 409, 500),
    );
  },
  VoHieuHoaNguoiDung() {
    return applyDecorators(
      ApiBearerOperation({
        summary: 'Vô hiệu hóa tài khoản người dùng',
        roles: [Role.ADMIN],
        notes:
          'Logic hiện tại là xóa mềm: tài khoản không bị xóa cứng mà được cập nhật `isActive = false`.',
      }),
      ApiParam({ name: 'id', description: 'ID người dùng', format: 'uuid' }),
      ApiWrappedOkResponse({
        type: UserResponseDto,
        description: 'Vô hiệu hóa người dùng thành công.',
      }),
      ApiStandardErrorResponses(400, 401, 403, 404, 500),
    );
  },
};
