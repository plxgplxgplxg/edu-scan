import { AnswerChoice, Difficulty } from '@prisma/client';
import { QuestionsRepository } from './questions.repository';

describe('QuestionsRepository', () => {
  const tx = {
    tag: {
      findMany: jest.fn(),
      createMany: jest.fn(),
    },
    question: {
      create: jest.fn(),
      updateMany: jest.fn(),
      update: jest.fn(),
      findUnique: jest.fn(),
      findUniqueOrThrow: jest.fn(),
      findFirst: jest.fn(),
    },
    questionTag: {
      deleteMany: jest.fn(),
      createMany: jest.fn(),
    },
  };

  const prisma = {
    $transaction: jest.fn(),
    question: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      deleteMany: jest.fn(),
    },
  };

  let repository: QuestionsRepository;

  beforeEach(() => {
    jest.clearAllMocks();
    repository = new QuestionsRepository(prisma as never);
    prisma.$transaction.mockImplementation(
      (callback: (args: typeof tx) => unknown) => callback(tx),
    );
  });

  it('creates missing tags then links them during question creation', async () => {
    tx.tag.findMany.mockResolvedValue([{ id: 'tag-1', name: 'algebra' }]);
    tx.tag.createMany.mockResolvedValue({ count: 1 });
    tx.question.create.mockResolvedValue({ id: 'question-1' });
    tx.tag.findMany
      .mockResolvedValueOnce([{ id: 'tag-1', name: 'algebra' }])
      .mockResolvedValueOnce([
        { id: 'tag-1', name: 'algebra' },
        { id: 'tag-2', name: 'geometry' },
      ]);
    tx.questionTag.createMany.mockResolvedValue({ count: 2 });
    tx.question.findUniqueOrThrow.mockResolvedValue(buildQuestionEntity());

    await repository.createQuestion('teacher-1', {
      content: 'Question',
      optionA: 'A',
      optionB: 'B',
      optionC: 'C',
      optionD: 'D',
      correctAnswer: AnswerChoice.A,
      subject: 'Math',
      difficulty: Difficulty.EASY,
      tags: ['algebra', 'geometry'],
    });

    expect(tx.tag.createMany).toHaveBeenCalledWith({
      data: [{ name: 'geometry' }],
      skipDuplicates: true,
    });
    expect(tx.questionTag.createMany).toHaveBeenCalledWith({
      data: [
        { questionId: 'question-1', tagId: 'tag-1' },
        { questionId: 'question-1', tagId: 'tag-2' },
      ],
      skipDuplicates: true,
    });
  });

  it('syncs tags exactly on update by removing old links and adding new links', async () => {
    tx.tag.findMany
      .mockResolvedValueOnce([{ id: 'tag-2', name: 'geometry' }])
      .mockResolvedValueOnce([
        { id: 'tag-2', name: 'geometry' },
        { id: 'tag-3', name: 'trigonometry' },
      ]);
    tx.tag.createMany.mockResolvedValue({ count: 1 });
    tx.question.updateMany.mockResolvedValue({ count: 1 });
    tx.questionTag.deleteMany.mockResolvedValue({ count: 1 });
    tx.questionTag.createMany.mockResolvedValue({ count: 1 });
    tx.question.findFirst.mockResolvedValue(buildQuestionEntity());

    await repository.updateQuestionForTeacher('question-1', 'teacher-1', {
      content: 'Updated',
      tags: ['geometry', 'trigonometry'],
    });

    expect(tx.questionTag.deleteMany).toHaveBeenCalledWith({
      where: {
        questionId: 'question-1',
        tagId: { notIn: ['tag-2', 'tag-3'] },
      },
    });
    expect(tx.questionTag.createMany).toHaveBeenCalledWith({
      data: [
        { questionId: 'question-1', tagId: 'tag-2' },
        { questionId: 'question-1', tagId: 'tag-3' },
      ],
      skipDuplicates: true,
    });
  });
});

function buildQuestionEntity() {
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
    tags: [],
  };
}
