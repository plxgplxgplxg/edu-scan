import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateQuestionDto } from '../dtos/create-question.dto';
import {
  DeleteQuestionResponseDto,
  QuestionListResponseDto,
  QuestionResponseDto,
  toQuestionListResponseDto,
  toQuestionResponseDto,
} from '../dtos/question-response.dto';
import {
  QueryQuestionsDto,
  QuestionSortBy,
  SortOrder,
} from '../dtos/query-questions.dto';
import { UpdateQuestionDto } from '../dtos/update-question.dto';
import { QuestionsRepository } from '../repositories/questions.repository';

@Injectable()
export class QuestionsService {
  constructor(private readonly questionsRepository: QuestionsRepository) {}

  async createQuestion(
    teacherId: string,
    dto: CreateQuestionDto,
  ): Promise<QuestionResponseDto> {
    const created = await this.questionsRepository.createQuestion(teacherId, {
      content: dto.content.trim(),
      optionA: dto.optionA.trim(),
      optionB: dto.optionB.trim(),
      optionC: dto.optionC.trim(),
      optionD: dto.optionD.trim(),
      correctAnswer: dto.correctAnswer,
      subject: dto.subject.trim(),
      difficulty: dto.difficulty,
      tags: this.normalizeTags(dto.tags),
    });

    return toQuestionResponseDto(created);
  }

  async listQuestions(
    teacherId: string,
    query: QueryQuestionsDto,
  ): Promise<QuestionListResponseDto> {
    const normalizedQuery = {
      ...query,
      page: Math.max(1, query.page ?? 1),
      limit: Math.min(100, Math.max(1, query.limit ?? 20)),
      subject: query.subject?.trim() || undefined,
      keyword: query.keyword?.trim() || undefined,
      tags: this.normalizeTags(query.tags),
      sortBy: query.sortBy ?? QuestionSortBy.CREATED_AT,
      sortOrder: query.sortOrder ?? SortOrder.DESC,
    };

    const result = await this.questionsRepository.listQuestionsForTeacher(
      teacherId,
      normalizedQuery,
    );

    return toQuestionListResponseDto(result);
  }

  async getQuestionById(
    questionId: string,
    teacherId: string,
  ): Promise<QuestionResponseDto> {
    await this.assertOwnership(questionId, teacherId);

    const question = await this.questionsRepository.findQuestionByIdForTeacher(
      questionId,
      teacherId,
    );

    if (!question) {
      throw new NotFoundException('Question not found');
    }

    return toQuestionResponseDto(question);
  }

  async updateQuestion(
    questionId: string,
    teacherId: string,
    dto: UpdateQuestionDto,
  ): Promise<QuestionResponseDto> {
    if (!this.hasAtLeastOneField(dto)) {
      throw new BadRequestException(
        'At least one field is required for update',
      );
    }

    await this.assertOwnership(questionId, teacherId);

    const updated = await this.questionsRepository.updateQuestionForTeacher(
      questionId,
      teacherId,
      {
        content: dto.content?.trim(),
        optionA: dto.optionA?.trim(),
        optionB: dto.optionB?.trim(),
        optionC: dto.optionC?.trim(),
        optionD: dto.optionD?.trim(),
        correctAnswer: dto.correctAnswer,
        subject: dto.subject?.trim(),
        difficulty: dto.difficulty,
        tags: dto.tags !== undefined ? this.normalizeTags(dto.tags) : undefined,
      },
    );

    if (!updated) {
      throw new NotFoundException('Question not found');
    }

    return toQuestionResponseDto(updated);
  }

  async deleteQuestion(
    questionId: string,
    teacherId: string,
  ): Promise<DeleteQuestionResponseDto> {
    await this.assertOwnership(questionId, teacherId);

    const deleted = await this.questionsRepository.deleteQuestionForTeacher(
      questionId,
      teacherId,
    );

    if (deleted.count === 0) {
      throw new NotFoundException('Question not found');
    }

    return {
      id: questionId,
      deleted: true,
    };
  }

  private async assertOwnership(questionId: string, teacherId: string) {
    const owner = await this.questionsRepository.findQuestionOwner(questionId);

    if (!owner) {
      throw new NotFoundException('Question not found');
    }

    if (owner.teacherId !== teacherId) {
      throw new ForbiddenException(
        'You do not have permission to access this question',
      );
    }
  }

  private normalizeTags(tags?: string[]): string[] {
    if (!tags || tags.length === 0) {
      return [];
    }

    return [
      ...new Set(tags.map((tag) => tag.trim().toLowerCase()).filter(Boolean)),
    ];
  }

  private hasAtLeastOneField(dto: UpdateQuestionDto): boolean {
    return (
      dto.content !== undefined ||
      dto.optionA !== undefined ||
      dto.optionB !== undefined ||
      dto.optionC !== undefined ||
      dto.optionD !== undefined ||
      dto.correctAnswer !== undefined ||
      dto.subject !== undefined ||
      dto.difficulty !== undefined ||
      dto.tags !== undefined
    );
  }
}
