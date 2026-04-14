import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { assertUserRole } from '../../../common/auth/assert-user-role';
import type { AuthenticatedUser } from '../../../common/auth/assert-user-role';
import { CurrentUser } from '../../../common/decorators/auth/current-user.decorator';
import { Roles } from '../../../common/decorators/auth/roles.decorator';
import { JwtAuthGuard } from '../../../common/guards/auth/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/auth/roles.guard';
import { CreateExamDto } from '../dto/request/create-exam.dto';
import {
  DeleteExamResponseDto,
  ExamResponseDto,
} from '../dto/response/exam-response.dto';
import { UpdateExamDto } from '../dto/request/update-exam.dto';
import { ExamsService } from '../services/exams.service';

@Controller('exams')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.TEACHER)
export class ExamsController {
  constructor(private readonly examsService: ExamsService) {}

  @Post()
  async createExam(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Body() createExamDto: CreateExamDto,
  ): Promise<ExamResponseDto> {
    assertUserRole(currentUser, [Role.TEACHER]);
    return this.examsService.createExam(currentUser.id, createExamDto);
  }

  @Get('my')
  async listTeacherExams(
    @CurrentUser() currentUser: AuthenticatedUser,
  ): Promise<ExamResponseDto[]> {
    assertUserRole(currentUser, [Role.TEACHER]);
    return this.examsService.listTeacherExams(currentUser.id);
  }

  @Get(':id')
  async getTeacherExamById(
    @Param('id', new ParseUUIDPipe({ version: '4' })) examId: string,
    @CurrentUser() currentUser: AuthenticatedUser,
  ): Promise<ExamResponseDto> {
    assertUserRole(currentUser, [Role.TEACHER]);
    return this.examsService.getTeacherExamById(examId, currentUser.id);
  }

  @Patch(':id')
  async updateExam(
    @Param('id', new ParseUUIDPipe({ version: '4' })) examId: string,
    @CurrentUser() currentUser: AuthenticatedUser,
    @Body() updateExamDto: UpdateExamDto,
  ): Promise<ExamResponseDto> {
    assertUserRole(currentUser, [Role.TEACHER]);
    return this.examsService.updateExam(examId, currentUser.id, updateExamDto);
  }

  @Delete(':id')
  async deleteExam(
    @Param('id', new ParseUUIDPipe({ version: '4' })) examId: string,
    @CurrentUser() currentUser: AuthenticatedUser,
  ): Promise<DeleteExamResponseDto> {
    assertUserRole(currentUser, [Role.TEACHER]);
    return this.examsService.deleteExam(examId, currentUser.id);
  }
}
