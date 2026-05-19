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
import { CurrentUser } from '../../../common/decorators/auth/current-user.decorator';
import { Roles } from '../../../common/decorators/auth/roles.decorator';
import { JwtAuthGuard } from '../../../common/guards/auth/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/auth/roles.guard';
import { QuestionsSwagger } from '../docs/questions.swagger';
import { CreateQuestionDto } from '../dtos/create-question.dto';
import { QueryQuestionsDto } from '../dtos/query-questions.dto';
import { UpdateQuestionDto } from '../dtos/update-question.dto';
import { QuestionsService } from '../services/questions.service';

@QuestionsSwagger.Controller()
@Controller('questions')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.TEACHER)
export class QuestionsController {
  constructor(private readonly questionsService: QuestionsService) {}

  @Post()
  @QuestionsSwagger.TaoCauHoi()
  async createQuestion(
    @CurrentUser('id') teacherId: string,
    @Body() createQuestionDto: CreateQuestionDto,
  ) {
    return this.questionsService.createQuestion(teacherId, createQuestionDto);
  }

  @Get()
  @QuestionsSwagger.LayDanhSachCauHoi()
  async listQuestions(
    @CurrentUser('id') teacherId: string,
    @Query() query: QueryQuestionsDto,
  ) {
    return this.questionsService.listQuestions(teacherId, query);
  }

  @Get(':id')
  @QuestionsSwagger.LayChiTietCauHoi()
  async getQuestionById(
    @Param('id') questionId: string,
    @CurrentUser('id') teacherId: string,
  ) {
    return this.questionsService.getQuestionById(questionId, teacherId);
  }

  @Patch(':id')
  @QuestionsSwagger.CapNhatCauHoi()
  async updateQuestion(
    @Param('id') questionId: string,
    @CurrentUser('id') teacherId: string,
    @Body() updateQuestionDto: UpdateQuestionDto,
  ) {
    return this.questionsService.updateQuestion(
      questionId,
      teacherId,
      updateQuestionDto,
    );
  }

  @Delete(':id')
  @QuestionsSwagger.XoaCauHoi()
  async deleteQuestion(
    @Param('id') questionId: string,
    @CurrentUser('id') teacherId: string,
  ) {
    return this.questionsService.deleteQuestion(questionId, teacherId);
  }
}
