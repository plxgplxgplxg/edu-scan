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
    summary: 'Lay danh sach nguoi dung',
    roles: [Role.ADMIN],
    notes: 'Chi ADMIN duoc xem danh sach tai khoan va trang thai kich hoat.',
  })
  @ApiWrappedOkResponse({
    type: UserResponseDto,
    isArray: true,
    description: 'Lay danh sach nguoi dung thanh cong.',
  })
  @ApiStandardErrorResponses(401, 403, 500)
  async listUsers(@CurrentUser() currentUser: AuthenticatedUser) {
    assertUserRole(currentUser, [Role.ADMIN]);
    return this.usersService.listUsers();
  }

  @Get(':id')
  @ApiBearerOperation({
    summary: 'Lay chi tiet nguoi dung theo id',
    roles: [Role.ADMIN],
  })
  @ApiParam({ name: 'id', description: 'User id', format: 'uuid' })
  @ApiWrappedOkResponse({
    type: UserResponseDto,
    description: 'Lay chi tiet nguoi dung thanh cong.',
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
    summary: 'Tao nguoi dung moi',
    roles: [Role.ADMIN],
    notes:
      'ADMIN co the tao ADMIN/TEACHER/STUDENT. studentCode bat buoc khi role la STUDENT.',
  })
  @ApiBody({ type: CreateUserDto })
  @ApiWrappedCreatedResponse({
    type: UserResponseDto,
    description: 'Tao nguoi dung thanh cong.',
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
    summary: 'Cap nhat thong tin nguoi dung',
    roles: [Role.ADMIN],
    notes:
      'ADMIN co the doi role, thong tin tai khoan va trang thai kich hoat. studentCode phai hop le neu user la STUDENT.',
  })
  @ApiParam({ name: 'id', description: 'User id', format: 'uuid' })
  @ApiBody({ type: UpdateUserDto })
  @ApiWrappedOkResponse({
    type: UserResponseDto,
    description: 'Cap nhat nguoi dung thanh cong.',
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
    summary: 'Vo hieu hoa tai khoan nguoi dung',
    roles: [Role.ADMIN],
    notes:
      'Business logic hien tai la soft-delete bang cach dat isActive = false.',
  })
  @ApiParam({ name: 'id', description: 'User id', format: 'uuid' })
  @ApiWrappedOkResponse({
    type: UserResponseDto,
    description: 'Vo hieu hoa nguoi dung thanh cong.',
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
