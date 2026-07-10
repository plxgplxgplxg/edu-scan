import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { assertUserRole } from '../../../common/auth/assert-user-role';
import type { AuthenticatedUser } from '../../../common/auth/assert-user-role';
import { CurrentUser } from '../../../common/decorators/auth/current-user.decorator';
import { Roles } from '../../../common/decorators/auth/roles.decorator';
import { JwtAuthGuard } from '../../../common/guards/auth/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/auth/roles.guard';
import { ClassesSwagger } from '../docs/classes.swagger';
import { AddStudentDto } from '../dto/request/add-student.dto';
import { CreateClassDto } from '../dto/request/create-class.dto';
import { UpdateClassDto } from '../dto/request/update-class.dto';
import { ClassesService } from '../services/classes.service';

@ClassesSwagger.Controller()
@Controller('classes')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ClassesController {
  constructor(private readonly classesService: ClassesService) {}

  @Post()
  @Roles(Role.TEACHER)
  @ClassesSwagger.TaoLopHoc()
  async createClass(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Body() createClassDto: CreateClassDto,
  ) {
    assertUserRole(currentUser, [Role.TEACHER]);
    return this.classesService.createClass(currentUser.id, createClassDto);
  }

  @Get('my')
  @Roles(Role.TEACHER)
  @ClassesSwagger.LayDanhSachLopHocCuaToi()
  async getMyClasses(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Query('page') page?: string,
  ) {
    assertUserRole(currentUser, [Role.TEACHER]);
    const parsedPage = page ? parseInt(page, 10) : 1;
    return this.classesService.listTeacherClasses(currentUser.id, parsedPage > 0 ? parsedPage : 1);
  }

  @Get()
  @Roles(Role.TEACHER, Role.STUDENT, Role.ADMIN)
  @ClassesSwagger.LayDanhSachLopHocTheoVaiTro()
  async listClasses(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Query('page') page?: string,
  ) {
    assertUserRole(currentUser, [Role.TEACHER, Role.STUDENT, Role.ADMIN]);
    const parsedPage = page ? parseInt(page, 10) : 1;
    return this.classesService.listClasses(currentUser, parsedPage > 0 ? parsedPage : 1);
  }

  @Get(':id')
  @Roles(Role.TEACHER, Role.STUDENT, Role.ADMIN)
  @ClassesSwagger.LayChiTietLopHoc()
  async getClassById(
    @Param('id') classId: string,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    assertUserRole(currentUser, [Role.TEACHER, Role.STUDENT, Role.ADMIN]);
    return this.classesService.getClassById(classId, currentUser);
  }

  @Patch(':id')
  @Roles(Role.TEACHER)
  @ClassesSwagger.CapNhatLopHoc()
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
  @ClassesSwagger.ThemHocSinh()
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
  @ClassesSwagger.XoaHocSinh()
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
  @ClassesSwagger.ThamGiaLopBangMa()
  async joinClassByCode(
    @Param('code') code: string,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    assertUserRole(currentUser, [Role.STUDENT]);
    return this.classesService.joinClassByCode(currentUser.id, code);
  }
}
