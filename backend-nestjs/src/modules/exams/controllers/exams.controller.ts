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
import { Role } from '@prisma/client';
import { CurrentUser } from '../../../common/decorators/auth/current-user.decorator';
import { Roles } from '../../../common/decorators/auth/roles.decorator';
import { JwtAuthGuard } from '../../../common/guards/auth/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/auth/roles.guard';
import { CreateExamDto } from '../dto/request/create-exam.dto';
import { UpdateExamDto } from '../dto/request/update-exam.dto';
import { ExamsService } from '../services/exams.service';

@Controller('exams')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.TEACHER)
export class ExamsController {
  constructor(private readonly examsService: ExamsService) {}

  @Post()
  async createExam(
    @CurrentUser('id') teacherId: string,
    @Body() createExamDto: CreateExamDto,
  ) {
    return this.examsService.createExam(teacherId, createExamDto);
  }

  @Get('my')
  async listTeacherExams(@CurrentUser('id') teacherId: string) {
    return this.examsService.listTeacherExams(teacherId);
  }

  @Get(':id')
  async getTeacherExamById(
    @Param('id') examId: string,
    @CurrentUser('id') teacherId: string,
  ) {
    return this.examsService.getTeacherExamById(examId, teacherId);
  }

  @Patch(':id')
  async updateExam(
    @Param('id') examId: string,
    @CurrentUser('id') teacherId: string,
    @Body() updateExamDto: UpdateExamDto,
  ) {
    return this.examsService.updateExam(examId, teacherId, updateExamDto);
  }

  @Delete(':id')
  async deleteExam(
    @Param('id') examId: string,
    @CurrentUser('id') teacherId: string,
  ) {
    return this.examsService.deleteExam(examId, teacherId);
  }
}