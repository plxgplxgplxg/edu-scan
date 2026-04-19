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
import { ApiBody, ApiParam, ApiQuery, ApiTags } from '@nestjs/swagger';
import { Difficulty, Role } from '@prisma/client';
import { CurrentUser } from '../../../common/decorators/auth/current-user.decorator';
import { Roles } from '../../../common/decorators/auth/roles.decorator';
import { JwtAuthGuard } from '../../../common/guards/auth/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/auth/roles.guard';
import { ApiBearerOperation } from '../../../common/swagger/decorators/api-auth.decorator';
import {
  ApiStandardErrorResponses,
  ApiWrappedCreatedResponse,
  ApiWrappedOkResponse,
} from '../../../common/swagger/decorators/api-responses.decorator';
import { CreateQuestionDto } from '../dtos/create-question.dto';
import {
  QueryQuestionsDto,
  QuestionSortBy,
  SortOrder,
} from '../dtos/query-questions.dto';
import {
  DeleteQuestionResponseDto,
  QuestionListResponseDto,
  QuestionResponseDto,
} from '../dtos/question-response.dto';
import { UpdateQuestionDto } from '../dtos/update-question.dto';
import { QuestionsService } from '../services/questions.service';

@ApiTags('questions')
@Controller('questions')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.TEACHER)
export class QuestionsController {
  constructor(private readonly questionsService: QuestionsService) {}

  @Post()
  @ApiBearerOperation({
    summary: 'Tao cau hoi moi trong question bank',
    roles: [Role.TEACHER],
  })
  @ApiBody({ type: CreateQuestionDto })
  @ApiWrappedCreatedResponse({
    type: QuestionResponseDto,
    description: 'Tao cau hoi thanh cong.',
  })
  @ApiStandardErrorResponses(400, 401, 403, 500)
  async createQuestion(
    @CurrentUser('id') teacherId: string,
    @Body() createQuestionDto: CreateQuestionDto,
  ) {
    return this.questionsService.createQuestion(teacherId, createQuestionDto);
  }

  @Get()
  @ApiBearerOperation({
    summary: 'Lay danh sach cau hoi cua giao vien',
    roles: [Role.TEACHER],
    notes: 'Ho tro filter theo subject, difficulty, tags, keyword va sap xep.',
  })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'subject', required: false, type: String })
  @ApiQuery({ name: 'difficulty', required: false, enum: Difficulty })
  @ApiQuery({
    name: 'tags',
    required: false,
    type: String,
    description: 'Comma-separated tags or repeated query param',
  })
  @ApiQuery({ name: 'keyword', required: false, type: String })
  @ApiQuery({ name: 'sortBy', required: false, enum: QuestionSortBy })
  @ApiQuery({ name: 'sortOrder', required: false, enum: SortOrder })
  @ApiWrappedOkResponse({
    type: QuestionListResponseDto,
    description: 'Lay danh sach cau hoi thanh cong.',
  })
  @ApiStandardErrorResponses(400, 401, 403, 500)
  async listQuestions(
    @CurrentUser('id') teacherId: string,
    @Query() query: QueryQuestionsDto,
  ) {
    return this.questionsService.listQuestions(teacherId, query);
  }

  @Get(':id')
  @ApiBearerOperation({
    summary: 'Lay chi tiet cau hoi',
    roles: [Role.TEACHER],
  })
  @ApiParam({ name: 'id', description: 'Question id', format: 'uuid' })
  @ApiWrappedOkResponse({
    type: QuestionResponseDto,
    description: 'Lay chi tiet cau hoi thanh cong.',
  })
  @ApiStandardErrorResponses(401, 403, 404, 500)
  async getQuestionById(
    @Param('id') questionId: string,
    @CurrentUser('id') teacherId: string,
  ) {
    return this.questionsService.getQuestionById(questionId, teacherId);
  }

  @Patch(':id')
  @ApiBearerOperation({
    summary: 'Cap nhat cau hoi',
    roles: [Role.TEACHER],
  })
  @ApiParam({ name: 'id', description: 'Question id', format: 'uuid' })
  @ApiBody({ type: UpdateQuestionDto })
  @ApiWrappedOkResponse({
    type: QuestionResponseDto,
    description: 'Cap nhat cau hoi thanh cong.',
  })
  @ApiStandardErrorResponses(400, 401, 403, 404, 500)
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
  @ApiBearerOperation({
    summary: 'Xoa cau hoi',
    roles: [Role.TEACHER],
  })
  @ApiParam({ name: 'id', description: 'Question id', format: 'uuid' })
  @ApiWrappedOkResponse({
    type: DeleteQuestionResponseDto,
    description: 'Xoa cau hoi thanh cong.',
  })
  @ApiStandardErrorResponses(401, 403, 404, 500)
  async deleteQuestion(
    @Param('id') questionId: string,
    @CurrentUser('id') teacherId: string,
  ) {
    return this.questionsService.deleteQuestion(questionId, teacherId);
  }
}
