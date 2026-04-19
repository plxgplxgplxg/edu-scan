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
import { AddStudentDto } from '../dto/request/add-student.dto';
import { CreateClassDto } from '../dto/request/create-class.dto';
import { UpdateClassDto } from '../dto/request/update-class.dto';
import { ClassResponseDto } from '../dto/response/class-response.dto';
import { ClassesService } from '../services/classes.service';

@ApiTags('classes')
@Controller('classes')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ClassesController {
  constructor(private readonly classesService: ClassesService) {}

  @Post()
  @Roles(Role.TEACHER)
  @ApiBearerOperation({
    summary: 'Tao lop hoc moi',
    roles: [Role.TEACHER],
  })
  @ApiBody({ type: CreateClassDto })
  @ApiWrappedCreatedResponse({
    type: ClassResponseDto,
    description: 'Tao lop hoc thanh cong.',
  })
  @ApiStandardErrorResponses(400, 401, 403, 500)
  async createClass(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Body() createClassDto: CreateClassDto,
  ) {
    assertUserRole(currentUser, [Role.TEACHER]);
    return this.classesService.createClass(currentUser.id, createClassDto);
  }

  @Get('my')
  @Roles(Role.TEACHER)
  @ApiBearerOperation({
    summary: 'Lay danh sach lop hoc cua giao vien hien tai',
    roles: [Role.TEACHER],
  })
  @ApiWrappedOkResponse({
    type: ClassResponseDto,
    isArray: true,
    description: 'Lay danh sach lop hoc thanh cong.',
  })
  @ApiStandardErrorResponses(401, 403, 500)
  async getMyClasses(@CurrentUser() currentUser: AuthenticatedUser) {
    assertUserRole(currentUser, [Role.TEACHER]);
    return this.classesService.listTeacherClasses(currentUser.id);
  }

  @Get(':id')
  @Roles(Role.TEACHER)
  @ApiBearerOperation({
    summary: 'Lay chi tiet lop hoc theo id',
    roles: [Role.TEACHER],
  })
  @ApiParam({ name: 'id', description: 'Class id', format: 'uuid' })
  @ApiWrappedOkResponse({
    type: ClassResponseDto,
    description: 'Lay chi tiet lop hoc thanh cong.',
  })
  @ApiStandardErrorResponses(401, 403, 404, 500)
  async getClassById(
    @Param('id') classId: string,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    assertUserRole(currentUser, [Role.TEACHER]);
    return this.classesService.getTeacherClassById(classId, currentUser.id);
  }

  @Patch(':id')
  @Roles(Role.TEACHER)
  @ApiBearerOperation({
    summary: 'Cap nhat thong tin lop hoc',
    roles: [Role.TEACHER],
  })
  @ApiParam({ name: 'id', description: 'Class id', format: 'uuid' })
  @ApiBody({ type: UpdateClassDto })
  @ApiWrappedOkResponse({
    type: ClassResponseDto,
    description: 'Cap nhat lop hoc thanh cong.',
  })
  @ApiStandardErrorResponses(400, 401, 403, 404, 500)
  async updateClass(
    @Param('id') classId: string,
    @CurrentUser() currentUser: AuthenticatedUser,
    @Body() updateClassDto: UpdateClassDto,
  ) {
    assertUserRole(currentUser, [Role.TEACHER]);
    return this.classesService.updateClass(
      classId,
      currentUser.id,
      updateClassDto,
    );
  }

  @Post(':id/students')
  @Roles(Role.TEACHER)
  @ApiBearerOperation({
    summary: 'Them hoc sinh vao lop hoc',
    roles: [Role.TEACHER],
    notes:
      'Hoc sinh co the duoc xac dinh bang email, studentId hoac studentCode. Chi can mot identifier hop le.',
  })
  @ApiParam({ name: 'id', description: 'Class id', format: 'uuid' })
  @ApiBody({ type: AddStudentDto })
  @ApiWrappedOkResponse({
    type: ClassResponseDto,
    description: 'Them hoc sinh vao lop thanh cong.',
  })
  @ApiStandardErrorResponses(400, 401, 403, 404, 500)
  async addStudentToClass(
    @Param('id') classId: string,
    @CurrentUser() currentUser: AuthenticatedUser,
    @Body() addStudentDto: AddStudentDto,
  ) {
    assertUserRole(currentUser, [Role.TEACHER]);
    return this.classesService.addStudentToClass(
      classId,
      currentUser.id,
      addStudentDto,
    );
  }

  @Delete(':id/students/:studentId')
  @Roles(Role.TEACHER)
  @ApiBearerOperation({
    summary: 'Xoa hoc sinh khoi lop hoc',
    roles: [Role.TEACHER],
  })
  @ApiParam({ name: 'id', description: 'Class id', format: 'uuid' })
  @ApiParam({ name: 'studentId', description: 'Student id', format: 'uuid' })
  @ApiWrappedOkResponse({
    type: ClassResponseDto,
    description: 'Xoa hoc sinh khoi lop thanh cong.',
  })
  @ApiStandardErrorResponses(400, 401, 403, 404, 500)
  async removeStudentFromClass(
    @Param('id') classId: string,
    @Param('studentId') studentId: string,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    assertUserRole(currentUser, [Role.TEACHER]);
    return this.classesService.removeStudentFromClass(
      classId,
      studentId,
      currentUser.id,
    );
  }

  @Post('join/:code')
  @Roles(Role.STUDENT)
  @ApiBearerOperation({
    summary: 'Hoc sinh tham gia lop bang ma code',
    roles: [Role.STUDENT],
  })
  @ApiParam({ name: 'code', description: 'Class join code' })
  @ApiWrappedOkResponse({
    type: ClassResponseDto,
    description: 'Tham gia lop thanh cong.',
  })
  @ApiStandardErrorResponses(400, 401, 403, 404, 500)
  async joinClassByCode(
    @Param('code') code: string,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    assertUserRole(currentUser, [Role.STUDENT]);
    return this.classesService.joinClassByCode(currentUser.id, code);
  }
}
