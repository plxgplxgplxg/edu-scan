import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { AnswerChoice, Difficulty } from '@prisma/client';
import { CreateQuestionDto } from '../dtos/create-question.dto';
import { QueryQuestionsDto } from '../dtos/query-questions.dto';
import { UpdateQuestionDto } from '../dtos/update-question.dto';
import { QuestionsService } from './questions.service';

describe('QuestionsService', () => {
  let service: QuestionsService;

  const questionsRepository = {
    findQuestionOwner: jest.fn(),
    createQuestion: jest.fn(),
    listQuestionsForTeacher: jest.fn(),
    findQuestionByIdForTeacher: jest.fn(),
    updateQuestionForTeacher: jest.fn(),
    deleteQuestionForTeacher: jest.fn(),
  };

  const teacherId = 'teacher-1';
  const otherTeacherId = 'teacher-2';
  const questionId = 'question-1';

  beforeEach(() => {
    jest.clearAllMocks();
    service = new QuestionsService(questionsRepository as never);
  });

  it('creates question with normalized tags and deduplicated values', async () => {
    const createDto: CreateQuestionDto = {
      content: 'Question content',
      optionA: 'A',
      optionB: 'B',
      optionC: 'C',
      optionD: 'D',
      correctAnswer: AnswerChoice.A,
      subject: 'Math',
      difficulty: Difficulty.EASY,
      tags: [' algebra ', 'Algebra', 'geometry', 'geometry'],
    };

    questionsRepository.createQuestion.mockResolvedValue(buildQuestionEntity());

    await service.createQuestion(teacherId, createDto);

    expect(questionsRepository.createQuestion).toHaveBeenCalledWith(
      teacherId,
      expect.objectContaining({
        content: 'Question content',
        tags: ['algebra', 'geometry'],
      }),
    );
  });

  it('lists teacher questions with safe defaults for pagination and sorting', async () => {
    questionsRepository.listQuestionsForTeacher.mockResolvedValue({
      items: [buildQuestionEntity()],
      total: 1,
      page: 1,
      limit: 20,
    });

    const query = new QueryQuestionsDto();
    const result = await service.listQuestions(teacherId, query);

    expect(questionsRepository.listQuestionsForTeacher).toHaveBeenCalledWith(
      teacherId,
      expect.objectContaining({
        page: 1,
        limit: 20,
        sortBy: 'createdAt',
        sortOrder: 'desc',
      }),
    );
    expect(result.items).toHaveLength(1);
    expect(result.total).toBe(1);
  });

  it('throws not found when question does not exist', async () => {
    questionsRepository.findQuestionOwner.mockResolvedValue(null);

    await expect(
      service.getQuestionById(questionId, teacherId),
    ).rejects.toThrow(NotFoundException);
  });

  it('throws forbidden when question belongs to another teacher', async () => {
    questionsRepository.findQuestionOwner.mockResolvedValue({
      teacherId: otherTeacherId,
    });

    await expect(
      service.getQuestionById(questionId, teacherId),
    ).rejects.toThrow(ForbiddenException);
  });

  it('throws bad request when update payload is empty', async () => {
    const updateDto: UpdateQuestionDto = {};

    await expect(
      service.updateQuestion(questionId, teacherId, updateDto),
    ).rejects.toThrow(BadRequestException);

    expect(questionsRepository.updateQuestionForTeacher).not.toHaveBeenCalled();
  });

  it('updates question after ownership check', async () => {
    const updateDto: UpdateQuestionDto = {
      content: 'Updated content',
      tags: ['new-tag'],
    };

    questionsRepository.findQuestionOwner.mockResolvedValue({ teacherId });
    questionsRepository.updateQuestionForTeacher.mockResolvedValue(
      buildQuestionEntity({ content: 'Updated content' }),
    );

    const result = await service.updateQuestion(
      questionId,
      teacherId,
      updateDto,
    );

    expect(questionsRepository.updateQuestionForTeacher).toHaveBeenCalledWith(
      questionId,
      teacherId,
      expect.objectContaining({
        content: 'Updated content',
        tags: ['new-tag'],
      }),
    );
    expect(result.content).toBe('Updated content');
  });

  it('deletes question when owner is valid', async () => {
    questionsRepository.findQuestionOwner.mockResolvedValue({ teacherId });
    questionsRepository.deleteQuestionForTeacher.mockResolvedValue({
      count: 1,
    });

    const result = await service.deleteQuestion(questionId, teacherId);

    expect(questionsRepository.deleteQuestionForTeacher).toHaveBeenCalledWith(
      questionId,
      teacherId,
    );
    expect(result).toEqual({ id: questionId, deleted: true });
  });
});

function buildQuestionEntity(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'question-1',
    content: 'Question content',
    optionA: 'A',
    optionB: 'B',
    optionC: 'C',
    optionD: 'D',
    correctAnswer: AnswerChoice.A,
    subject: 'Math',
    difficulty: Difficulty.EASY,
    teacherId: 'teacher-1',
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    tags: [
      {
        tag: {
          id: 'tag-1',
          name: 'algebra',
        },
      },
    ],
    ...overrides,
  };
}
