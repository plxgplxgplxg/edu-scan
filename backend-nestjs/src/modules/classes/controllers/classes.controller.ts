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
import { JwtAuthGuard } from '../../../common/guards/auth/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/auth/roles.guard';
import { ClassesService } from '../services/classes.service';
import { CurrentUser } from '../../../common/decorators/auth/current-user.decorator';
import { CreateClassDto } from '../dto/request/create-class.dto';
import { Roles } from '../../../common/decorators/auth/roles.decorator';
import { Role } from '@prisma/client';
import { UpdateClassDto } from '../dto/request/update-class.dto';
import { AddStudentDto } from '../dto/request/add-student.dto';
import { assertUserRole } from '../../../common/auth/assert-user-role';
import type { AuthenticatedUser } from '../../../common/auth/assert-user-role';

@Controller('classes')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ClassesController {
  constructor(private readonly classesService: ClassesService) {}

  @Post()
  @Roles(Role.TEACHER)
  async createClass(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Body() createClassDto: CreateClassDto,
  ) {
    assertUserRole(currentUser, [Role.TEACHER]);
    return this.classesService.createClass(currentUser.id, createClassDto);
  }

  @Get('my')
  @Roles(Role.TEACHER)
  async getMyClasses(@CurrentUser() currentUser: AuthenticatedUser) {
    assertUserRole(currentUser, [Role.TEACHER]);
    return this.classesService.listTeacherClasses(currentUser.id);
  }

  @Get(':id')
  @Roles(Role.TEACHER)
  async getClassById(
    @Param('id') classId: string,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    assertUserRole(currentUser, [Role.TEACHER]);
    return this.classesService.getTeacherClassById(classId, currentUser.id);
  }

  @Patch(':id')
  @Roles(Role.TEACHER)
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
  async joinClassByCode(
    @Param('code') code: string,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    assertUserRole(currentUser, [Role.STUDENT]);
    return this.classesService.joinClassByCode(currentUser.id, code);
  }
}
