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
    summary: 'Tạo lớp học mới',
    roles: [Role.TEACHER],
    notes:
      'Giáo viên tạo lớp học mới và hệ thống sinh mã lớp để học sinh tham gia.',
  })
  @ApiBody({ type: CreateClassDto })
  @ApiWrappedCreatedResponse({
    type: ClassResponseDto,
    description: 'Tạo lớp học thành công.',
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
    summary: 'Lấy danh sách lớp học của giáo viên hiện tại',
    roles: [Role.TEACHER],
  })
  @ApiWrappedOkResponse({
    type: ClassResponseDto,
    isArray: true,
    description: 'Lấy danh sách lớp học thành công.',
  })
  @ApiStandardErrorResponses(401, 403, 500)
  async getMyClasses(@CurrentUser() currentUser: AuthenticatedUser) {
    assertUserRole(currentUser, [Role.TEACHER]);
    return this.classesService.listTeacherClasses(currentUser.id);
  }

  @Get(':id')
  @Roles(Role.TEACHER)
  @ApiBearerOperation({
    summary: 'Lấy chi tiết lớp học theo ID',
    roles: [Role.TEACHER],
    notes:
      'Trả về thông tin lớp, giáo viên phụ trách và danh sách học sinh đã ghi danh.',
  })
  @ApiParam({ name: 'id', description: 'ID lớp học', format: 'uuid' })
  @ApiWrappedOkResponse({
    type: ClassResponseDto,
    description: 'Lấy chi tiết lớp học thành công.',
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
    summary: 'Cập nhật thông tin lớp học',
    roles: [Role.TEACHER],
  })
  @ApiParam({ name: 'id', description: 'ID lớp học', format: 'uuid' })
  @ApiBody({ type: UpdateClassDto })
  @ApiWrappedOkResponse({
    type: ClassResponseDto,
    description: 'Cập nhật lớp học thành công.',
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
    summary: 'Thêm học sinh vào lớp học',
    roles: [Role.TEACHER],
    notes:
      'Học sinh có thể được xác định bằng `email`, `studentId` hoặc `studentCode`. Chỉ cần cung cấp một định danh hợp lệ.',
  })
  @ApiParam({ name: 'id', description: 'ID lớp học', format: 'uuid' })
  @ApiBody({ type: AddStudentDto })
  @ApiWrappedOkResponse({
    type: ClassResponseDto,
    description: 'Thêm học sinh vào lớp thành công.',
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
    summary: 'Xóa học sinh khỏi lớp học',
    roles: [Role.TEACHER],
  })
  @ApiParam({ name: 'id', description: 'ID lớp học', format: 'uuid' })
  @ApiParam({ name: 'studentId', description: 'ID học sinh', format: 'uuid' })
  @ApiWrappedOkResponse({
    type: ClassResponseDto,
    description: 'Xóa học sinh khỏi lớp thành công.',
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
    summary: 'Học sinh tham gia lớp bằng mã lớp',
    roles: [Role.STUDENT],
    notes:
      'Mã lớp được giáo viên tạo sẵn. Học sinh sẽ được thêm vào danh sách ghi danh của lớp nếu mã hợp lệ.',
  })
  @ApiParam({ name: 'code', description: 'Mã tham gia lớp học' })
  @ApiWrappedOkResponse({
    type: ClassResponseDto,
    description: 'Tham gia lớp thành công.',
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
