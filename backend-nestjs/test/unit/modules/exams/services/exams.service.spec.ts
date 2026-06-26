import { BadRequestException, NotFoundException } from '@nestjs/common';
import { AnswerChoice } from '@prisma/client';
import { CreateExamDto } from '../../../../../src/modules/exams/dto/request/create-exam.dto';
import { ExamsService } from '../../../../../src/modules/exams/services/exams.service';

describe('ExamsService', () => {
  let service: ExamsService;

  const examsRepository = {
    createExam: jest.fn(),
    listTeacherExams: jest.fn(),
    findTeacherExamById: jest.fn(),
    findTeacherClassesByIds: jest.fn(),
    findTeacherQuestionsByIds: jest.fn(),
    countExamDependencies: jest.fn(),
    updateExam: jest.fn(),
    deleteExam: jest.fn(),
  };

  const teacherId = 'teacher-1';
  const examId = 'exam-1';

  beforeEach(() => {
    jest.clearAllMocks();
    service = new ExamsService(examsRepository as never);
  });

  it('normalizes and creates an exam', async () => {
    const createExamDto: CreateExamDto = {
      title: '  Midterm Exam  ',
      maxScore: 10,
      classIds: ['class-b', 'class-a', 'class-a'],
      variants: [
        {
          testCode: 'b02',
          answerKeys: [
            { questionNumber: 2, correctAnswer: AnswerChoice.B },
            { questionNumber: 1, correctAnswer: AnswerChoice.A },
          ],
        },
      ],
      questionMap: [
        { questionNumber: 2, questionId: 'question-2' },
        { questionNumber: 1, questionId: 'question-1' },
      ],
    };

    examsRepository.findTeacherClassesByIds.mockResolvedValue([
      { id: 'class-a' },
      { id: 'class-b' },
    ]);
    examsRepository.findTeacherQuestionsByIds.mockResolvedValue([
      { id: 'question-1' },
      { id: 'question-2' },
    ]);
    examsRepository.createExam.mockResolvedValue(buildExamEntity());

    await service.createExam(teacherId, createExamDto);

    expect(examsRepository.createExam).toHaveBeenCalledWith({
      title: 'Midterm Exam',
      maxScore: 10,
      type: 'OMR',
      teacherId,
      classIds: ['class-b', 'class-a'],
      variants: [
        {
          testCode: 'B02',
          answerKeys: [
            { questionNumber: 1, correctAnswer: AnswerChoice.A },
            { questionNumber: 2, correctAnswer: AnswerChoice.B },
          ],
        },
      ],
      questionMap: [
        { questionNumber: 1, questionId: 'question-1' },
        { questionNumber: 2, questionId: 'question-2' },
      ],
    });
  });

  it('rejects create when question map references a missing answer key number', async () => {
    examsRepository.findTeacherClassesByIds.mockResolvedValue([
      { id: 'class-a' },
    ]);
    examsRepository.findTeacherQuestionsByIds.mockResolvedValue([
      { id: 'question-1' },
    ]);

    await expect(
      service.createExam(teacherId, {
        title: 'Exam',
        maxScore: 10,
        classIds: ['class-a'],
        variants: [
          {
            testCode: 'A01',
            answerKeys: [{ questionNumber: 1, correctAnswer: AnswerChoice.A }],
          },
        ],
        questionMap: [{ questionNumber: 2, questionId: 'question-1' }],
      }),
    ).rejects.toThrow(BadRequestException);

    expect(examsRepository.createExam).not.toHaveBeenCalled();
  });

  it('blocks structural updates once submissions or OMR batches exist', async () => {
    examsRepository.findTeacherExamById.mockResolvedValue(buildExamEntity());
    examsRepository.countExamDependencies.mockResolvedValue({
      submissionCount: 1,
      batchCount: 0,
    });

    await expect(
      service.updateExam(examId, teacherId, {
        classIds: ['class-a', 'class-b'],
      }),
    ).rejects.toThrow(BadRequestException);

    expect(examsRepository.updateExam).not.toHaveBeenCalled();
  });

  it('allows metadata-only update after dependent data exists', async () => {
    examsRepository.findTeacherExamById.mockResolvedValue(buildExamEntity());
    examsRepository.countExamDependencies.mockResolvedValue({
      submissionCount: 2,
      batchCount: 1,
    });
    examsRepository.findTeacherClassesByIds.mockResolvedValue([
      { id: 'class-a' },
    ]);
    examsRepository.updateExam.mockResolvedValue(
      buildExamEntity({ title: 'Updated title' }),
    );

    await service.updateExam(examId, teacherId, {
      title: 'Updated title',
    });

    expect(examsRepository.updateExam).toHaveBeenCalledWith(examId, {
      title: 'Updated title',
      maxScore: 10,
      classIds: ['class-a'],
      variants: [
        {
          testCode: 'A01',
          answerKeys: [
            { questionNumber: 1, correctAnswer: AnswerChoice.A },
            { questionNumber: 2, correctAnswer: AnswerChoice.B },
          ],
        },
      ],
      questionMap: [{ questionNumber: 1, questionId: 'question-1' }],
    });
  });

  it('rejects delete when the exam already has dependent data', async () => {
    examsRepository.findTeacherExamById.mockResolvedValue(buildExamEntity());
    examsRepository.countExamDependencies.mockResolvedValue({
      submissionCount: 0,
      batchCount: 1,
    });

    await expect(service.deleteExam(examId, teacherId)).rejects.toThrow(
      BadRequestException,
    );

    expect(examsRepository.deleteExam).not.toHaveBeenCalled();
  });

  it('throws not found when deleting a missing exam', async () => {
    examsRepository.findTeacherExamById.mockResolvedValue(null);

    await expect(service.deleteExam(examId, teacherId)).rejects.toThrow(
      NotFoundException,
    );
  });
});

function buildExamEntity(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'exam-1',
    title: 'Exam',
    maxScore: 10,
    type: 'OMR',
    teacherId: 'teacher-1',
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    teacher: {
      id: 'teacher-1',
      name: 'Teacher',
      email: 'teacher@example.com',
    },
    classes: [
      {
        class: {
          id: 'class-a',
          name: '12A1',
          subject: 'Math',
          schoolYear: '2025-2026',
          code: 'EDU-123456',
        },
      },
    ],
    variants: [
      {
        id: 'variant-1',
        testCode: 'A01',
        answerKeys: [
          { questionNumber: 1, correctAnswer: AnswerChoice.A },
          { questionNumber: 2, correctAnswer: AnswerChoice.B },
        ],
      },
    ],
    questionMap: [
      {
        questionNumber: 1,
        questionId: 'question-1',
        question: {
          id: 'question-1',
          content: 'Question 1',
          subject: 'Math',
          difficulty: 'EASY',
        },
      },
    ],
    ...overrides,
  };
}
