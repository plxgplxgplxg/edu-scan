import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBody, ApiParam, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { CurrentUser } from '../../../common/decorators/auth/current-user.decorator';
import { Roles } from '../../../common/decorators/auth/roles.decorator';
import { assertUserRole } from '../../../common/auth/assert-user-role';
import type { AuthenticatedUser } from '../../../common/auth/assert-user-role';
import { JwtAuthGuard } from '../../../common/guards/auth/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/auth/roles.guard';
import { ApiBearerOperation } from '../../../common/swagger/decorators/api-auth.decorator';
import {
  ApiStandardErrorResponses,
  ApiWrappedCreatedResponse,
  ApiWrappedOkResponse,
} from '../../../common/swagger/decorators/api-responses.decorator';
import { CreateUserDto } from '../dto/request/create-user.dto';
import { UpdateUserDto } from '../dto/request/update-user.dto';
import { UserResponseDto } from '../dto/response/user-response.dto';
import { UsersService } from '../services/users.service';

@ApiTags('users')
@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @ApiBearerOperation({
    summary: 'Lấy danh sách người dùng',
    roles: [Role.ADMIN],
    notes:
      'Chỉ ADMIN được phép xem toàn bộ tài khoản cùng vai trò, mã học sinh và trạng thái kích hoạt hiện tại.',
  })
  @ApiWrappedOkResponse({
    type: UserResponseDto,
    isArray: true,
    description: 'Lấy danh sách người dùng thành công.',
  })
  @ApiStandardErrorResponses(401, 403, 500)
  async listUsers(@CurrentUser() currentUser: AuthenticatedUser) {
    assertUserRole(currentUser, [Role.ADMIN]);
    return this.usersService.listUsers();
  }

  @Get(':id')
  @ApiBearerOperation({
    summary: 'Lấy chi tiết người dùng theo ID',
    roles: [Role.ADMIN],
    notes:
      'Dùng để tra cứu chi tiết một tài khoản cụ thể theo khóa định danh UUID.',
  })
  @ApiParam({ name: 'id', description: 'ID người dùng', format: 'uuid' })
  @ApiWrappedOkResponse({
    type: UserResponseDto,
    description: 'Lấy chi tiết người dùng thành công.',
  })
  @ApiStandardErrorResponses(401, 403, 404, 500)
  async getUserById(
    @Param('id') userId: string,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    assertUserRole(currentUser, [Role.ADMIN]);
    return this.usersService.getUserById(userId);
  }

  @Post()
  @ApiBearerOperation({
    summary: 'Tạo người dùng mới',
    roles: [Role.ADMIN],
    notes:
      'ADMIN có thể tạo tài khoản ADMIN, TEACHER hoặc STUDENT. `studentCode` là bắt buộc khi role là STUDENT.',
  })
  @ApiBody({ type: CreateUserDto })
  @ApiWrappedCreatedResponse({
    type: UserResponseDto,
    description: 'Tạo người dùng thành công.',
  })
  @ApiStandardErrorResponses(400, 401, 403, 409, 500)
  async createUser(
    @Body() createUserDto: CreateUserDto,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    assertUserRole(currentUser, [Role.ADMIN]);
    return this.usersService.createUser(createUserDto);
  }

  @Patch(':id')
  @ApiBearerOperation({
    summary: 'Cập nhật thông tin người dùng',
    roles: [Role.ADMIN],
    notes:
      'ADMIN có thể đổi vai trò, thông tin tài khoản và trạng thái kích hoạt. `studentCode` phải hợp lệ nếu tài khoản là STUDENT.',
  })
  @ApiParam({ name: 'id', description: 'ID người dùng', format: 'uuid' })
  @ApiBody({ type: UpdateUserDto })
  @ApiWrappedOkResponse({
    type: UserResponseDto,
    description: 'Cập nhật người dùng thành công.',
  })
  @ApiStandardErrorResponses(400, 401, 403, 404, 409, 500)
  async updateUser(
    @Param('id') userId: string,
    @Body() updateUserDto: UpdateUserDto,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    assertUserRole(currentUser, [Role.ADMIN]);
    return this.usersService.updateUser(userId, updateUserDto);
  }

  @Delete(':id')
  @ApiBearerOperation({
    summary: 'Vô hiệu hóa tài khoản người dùng',
    roles: [Role.ADMIN],
    notes:
      'Business logic hiện tại là soft-delete: tài khoản không bị xóa cứng mà được cập nhật `isActive = false`.',
  })
  @ApiParam({ name: 'id', description: 'ID người dùng', format: 'uuid' })
  @ApiWrappedOkResponse({
    type: UserResponseDto,
    description: 'Vô hiệu hóa người dùng thành công.',
  })
  @ApiStandardErrorResponses(400, 401, 403, 404, 500)
  async deleteUser(
    @Param('id') userId: string,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    assertUserRole(currentUser, [Role.ADMIN]);
    return this.usersService.deleteUser(userId, currentUser.id);
  }
}
