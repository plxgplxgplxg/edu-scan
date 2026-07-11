import {
  Body,
  Controller,
  Delete,
  Get,
  Patch,
  Param,
  Post,
  Query,
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
import { UpdateExamDto } from '../dto/request/update-exam.dto';
import { GetExamsQueryDto } from '../dto/request/get-exams-query.dto';
import { ExamsService } from '../services/exams.service';
import { SubmissionsService } from '../../submissions/services/submissions.service';
import { GetSubmissionsQueryDto } from '../../submissions/dtos/get-submissions-query.dto';

@ExamsSwagger.Controller()
@Controller('exams')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ExamsController {
  constructor(
    private readonly examsService: ExamsService,
    private readonly submissionsService: SubmissionsService,
  ) {}

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
  async listMyOmrExams(
    @CurrentUser('id') teacherId: string,
    @Query() query: GetExamsQueryDto,
  ) {
    return this.examsService.listTeacherOmrExams(teacherId, query);
  }

  @Get('my')
  @Roles(Role.TEACHER)
  @ExamsSwagger.LayDanhSachDeThiCuaToi()
  async listTeacherExams(
    @CurrentUser('id') teacherId: string,
    @Query() query: GetExamsQueryDto,
  ) {
    return this.examsService.listTeacherExams(teacherId, query);
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

  @Post(':id/answer-keys')
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

  @Delete(':id/answer-keys')
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

  @Get(':id/submissions')
  @Roles(Role.TEACHER)
  @ExamsSwagger.LayDanhSachBaiLamCuaDeThi()
  async getExamSubmissions(
    @Param('id') examId: string,
    @Query() query: GetSubmissionsQueryDto,
  ) {
    return this.submissionsService.findAll({ ...query, examId });
  }
}
