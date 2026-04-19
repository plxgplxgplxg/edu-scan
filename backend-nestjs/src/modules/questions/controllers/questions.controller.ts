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
    summary: 'Tạo câu hỏi mới trong ngân hàng câu hỏi',
    roles: [Role.TEACHER],
  })
  @ApiBody({ type: CreateQuestionDto })
  @ApiWrappedCreatedResponse({
    type: QuestionResponseDto,
    description: 'Tạo câu hỏi thành công.',
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
    summary: 'Lấy danh sách câu hỏi của giáo viên',
    roles: [Role.TEACHER],
    notes:
      'Hỗ trợ phân trang, lọc theo môn học, độ khó, tags, từ khóa và sắp xếp kết quả.',
  })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'subject', required: false, type: String })
  @ApiQuery({ name: 'difficulty', required: false, enum: Difficulty })
  @ApiQuery({
    name: 'tags',
    required: false,
    type: String,
    description:
      'Danh sách tag, hỗ trợ dạng chuỗi phân tách bằng dấu phẩy hoặc lặp lại query param',
  })
  @ApiQuery({ name: 'keyword', required: false, type: String })
  @ApiQuery({ name: 'sortBy', required: false, enum: QuestionSortBy })
  @ApiQuery({ name: 'sortOrder', required: false, enum: SortOrder })
  @ApiWrappedOkResponse({
    type: QuestionListResponseDto,
    description: 'Lấy danh sách câu hỏi thành công.',
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
    summary: 'Lấy chi tiết câu hỏi',
    roles: [Role.TEACHER],
  })
  @ApiParam({ name: 'id', description: 'ID câu hỏi', format: 'uuid' })
  @ApiWrappedOkResponse({
    type: QuestionResponseDto,
    description: 'Lấy chi tiết câu hỏi thành công.',
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
    summary: 'Cập nhật câu hỏi',
    roles: [Role.TEACHER],
  })
  @ApiParam({ name: 'id', description: 'ID câu hỏi', format: 'uuid' })
  @ApiBody({ type: UpdateQuestionDto })
  @ApiWrappedOkResponse({
    type: QuestionResponseDto,
    description: 'Cập nhật câu hỏi thành công.',
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
    summary: 'Xóa câu hỏi',
    roles: [Role.TEACHER],
  })
  @ApiParam({ name: 'id', description: 'ID câu hỏi', format: 'uuid' })
  @ApiWrappedOkResponse({
    type: DeleteQuestionResponseDto,
    description: 'Xóa câu hỏi thành công.',
  })
  @ApiStandardErrorResponses(401, 403, 404, 500)
  async deleteQuestion(
    @Param('id') questionId: string,
    @CurrentUser('id') teacherId: string,
  ) {
    return this.questionsService.deleteQuestion(questionId, teacherId);
  }
}
