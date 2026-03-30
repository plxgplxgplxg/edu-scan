import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../../../common/guards/auth/jwt-auth.guard";
import { RolesGuard } from "../../../common/guards/auth/roles.guard";
import { ClassesService } from "../services/classes.service";
import { CurrentUser } from "../../../common/decorators/auth/current-user.decorator";
import { CreateClassDto } from "../dto/create-class.dto";
import { Roles } from "../../../common/decorators/auth/roles.decorator";
import { Role } from "@prisma/client";
import { UpdateClassDto } from "../dto/update-class.dto";
import { AddStudentDto } from "../dto/add-student.dto";

@Controller('classes')
@UseGuards(JwtAuthGuard, RolesGuard) 
export class ClassesController {
    constructor(private readonly classesService: ClassesService) {}

    @Post()
    @Roles(Role.TEACHER) 
    async createClass(
        @CurrentUser('id') teacherId: string,
        @Body() createClassDto: CreateClassDto,
    ) {
        return this.classesService.createClass(teacherId, createClassDto);
    }

    @Get()
    @Roles(Role.TEACHER)
    async getMyClasses(@CurrentUser('id') teacherId: string) {
        return this.classesService.listTeacherClasses(teacherId);
    }

    @Get(':id')
    @Roles(Role.TEACHER)
    async getClassById(
        @Param('id') classId: string,
        @CurrentUser('id') teacherId: string,
    ) {
        return this.classesService.getTeacherClassById(classId, teacherId);
    }

    @Patch(':id') 
    @Roles(Role.TEACHER)
    async updateClass(
        @Param('id') classId: string,
        @CurrentUser('id') teacherId: string,
        @Body() updateClassDto: UpdateClassDto,
    ) {
        return this.classesService.updateClass(classId, teacherId, updateClassDto);
    }

    @Post(':id/students')
    @Roles(Role.TEACHER)
    async addStudentToClass(
        @Param('id') classId: string,
        @CurrentUser('id') teacherId: string,
        @Body() addStudentDto: AddStudentDto,
    ) {
        return this.classesService.addStudentToClass(classId, teacherId, addStudentDto);
    }

    @Delete(':id/students/:studentId')
    @Roles(Role.TEACHER)
    async removeStudentFromClass(
        @Param('id') classId: string,
        @Param('studentId') studentId: string,
        @CurrentUser('id') teacherId: string,
    ) {
        return this.classesService.removeStudentFromClass(classId, studentId, teacherId);
    }

    @Post('join')
    @Roles(Role.STUDENT)
    async joinClassByCode(
        @CurrentUser('id') studentId: string,
        @Body('code') code: string,
    ) {
        return this.classesService.joinClassByCode(studentId, code);
    }
}
