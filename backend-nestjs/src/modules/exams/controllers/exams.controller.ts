import {
  Body,
  Controller,
  Delete,
  Get,
  Patch,
  Param,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { CurrentUser } from '../../../common/decorators/auth/current-user.decorator';
import { Roles } from '../../../common/decorators/auth/roles.decorator';
import { JwtAuthGuard } from '../../../common/guards/auth/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/auth/roles.guard';
import { ExamsSwagger } from '../docs/exams.swagger';
import { CreateExamDto } from '../dto/request/create-exam.dto';
import {
  RemoveExamQuestionAnswerDto,
  UpsertExamQuestionAnswerDto,
} from '../dto/request/upsert-exam-question-answer.dto';
import { CreateClassExamDto } from '../dto/request/create-class-exam.dto';
import { UpsertClassExamQuestionDto } from '../dto/request/upsert-class-exam-question.dto';
import { UpdateExamDto } from '../dto/request/update-exam.dto';
import { ExamsService } from '../services/exams.service';

@ExamsSwagger.Controller()
@Controller('exams')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ExamsController {
  constructor(private readonly examsService: ExamsService) {}

  @Post()
  @Roles(Role.TEACHER)
  @ExamsSwagger.TaoDeThi()
  async createExam(
    @CurrentUser('id') teacherId: string,
    @Body() createExamDto: CreateExamDto,
  ) {
    return this.examsService.createExam(teacherId, createExamDto);
  }

  @Post('omr')
  @Roles(Role.TEACHER)
  async createOmrExam(
    @CurrentUser('id') teacherId: string,
    @Body() createExamDto: CreateExamDto,
  ) {
    return this.examsService.createOmrExam(teacherId, createExamDto);
  }

  @Get('omr/my')
  @Roles(Role.TEACHER)
  async listMyOmrExams(@CurrentUser('id') teacherId: string) {
    return this.examsService.listTeacherOmrExams(teacherId);
  }

  @Post('class')
  @Roles(Role.TEACHER)
  async createClassExam(
    @CurrentUser('id') teacherId: string,
    @Body() createExamDto: CreateClassExamDto,
  ) {
    return this.examsService.createClassExam(teacherId, createExamDto);
  }

  @Get('class/my')
  @Roles(Role.TEACHER, Role.STUDENT)
  async listMyClassExams(@Request() req: { user: { id: string; role: Role } }) {
    return this.examsService.listClassExams(req.user.id, req.user.role);
  }

  @Post('class/:id/questions')
  @Roles(Role.TEACHER)
  async upsertClassExamQuestion(
    @Param('id') examId: string,
    @CurrentUser('id') teacherId: string,
    @Body() payload: UpsertClassExamQuestionDto,
  ) {
    return this.examsService.upsertClassExamQuestion(
      examId,
      teacherId,
      payload,
    );
  }

  @Delete('class/:id/questions')
  @Roles(Role.TEACHER)
  async removeClassExamQuestion(
    @Param('id') examId: string,
    @CurrentUser('id') teacherId: string,
    @Body() payload: { questionId: string },
  ) {
    return this.examsService.removeClassExamQuestion(
      examId,
      teacherId,
      payload.questionId,
    );
  }

  @Post('class/:id/publish')
  @Roles(Role.TEACHER)
  async publishClassExam(
    @Param('id') examId: string,
    @CurrentUser('id') teacherId: string,
  ) {
    return this.examsService.publishClassExam(examId, teacherId);
  }

  @Get('my')
  @Roles(Role.TEACHER)
  @ExamsSwagger.LayDanhSachDeThiCuaToi()
  async listTeacherExams(@CurrentUser('id') teacherId: string) {
    return this.examsService.listTeacherExams(teacherId);
  }

  @Get(':id')
  @Roles(Role.TEACHER)
  @ExamsSwagger.LayChiTietDeThi()
  async getTeacherExamById(
    @Param('id') examId: string,
    @CurrentUser('id') teacherId: string,
  ) {
    return this.examsService.getTeacherExamById(examId, teacherId);
  }

  @Patch(':id')
  @Roles(Role.TEACHER)
  @ExamsSwagger.CapNhatDeThi()
  async updateExam(
    @Param('id') examId: string,
    @CurrentUser('id') teacherId: string,
    @Body() updateExamDto: UpdateExamDto,
  ) {
    return this.examsService.updateExam(examId, teacherId, updateExamDto);
  }

  @Post(':id/questions')
  @Roles(Role.TEACHER)
  async upsertExamQuestionAnswer(
    @Param('id') examId: string,
    @CurrentUser('id') teacherId: string,
    @Body() payload: UpsertExamQuestionAnswerDto,
  ) {
    return this.examsService.upsertExamQuestionAnswer(
      examId,
      teacherId,
      payload,
    );
  }

  @Delete(':id/questions')
  @Roles(Role.TEACHER)
  async removeExamQuestionAnswer(
    @Param('id') examId: string,
    @CurrentUser('id') teacherId: string,
    @Body() payload: RemoveExamQuestionAnswerDto,
  ) {
    return this.examsService.removeExamQuestionAnswer(
      examId,
      teacherId,
      payload,
    );
  }

  @Post(':id/publish')
  @Roles(Role.TEACHER)
  async publishExam(
    @Param('id') examId: string,
    @CurrentUser('id') teacherId: string,
  ) {
    return this.examsService.publishExam(examId, teacherId);
  }

  @Delete(':id')
  @Roles(Role.TEACHER)
  @ExamsSwagger.XoaDeThi()
  async deleteExam(
    @Param('id') examId: string,
    @CurrentUser('id') teacherId: string,
  ) {
    return this.examsService.deleteExam(examId, teacherId);
  }
}
