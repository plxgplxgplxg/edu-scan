import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { AnswerChoice, OmrBatchStatus, SubmissionStatus } from '@prisma/client';
import { BatchService } from '../../../../../src/modules/omr/services/batch.service';

describe('BatchService', () => {
  let service: BatchService;

  const omrRepository = {
    createBatch: jest.fn(),
    markBatchStatus: jest.fn(),
    recordSuccessfulFile: jest.fn(),
    recordFailedFile: jest.fn(),
    findBatchById: jest.fn(),
    findTeacherBatchById: jest.fn(),
  };

  const gradingService = {
    calculateScore: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    service = new BatchService(omrRepository as never, gradingService as never);
    gradingService.calculateScore.mockReturnValue(7.5);
  });

  it('throws not found when batch does not exist', async () => {
    omrRepository.findBatchById.mockResolvedValue(null);

    await expect(
      service.getTeacherBatchById('batch-1', 'teacher-1'),
    ).rejects.toThrow(NotFoundException);
  });

  it('throws forbidden when batch belongs to another teacher', async () => {
    omrRepository.findBatchById.mockResolvedValue({
      id: 'batch-1',
      teacherId: 'teacher-2',
    });

    await expect(
      service.getTeacherBatchById('batch-1', 'teacher-1'),
    ).rejects.toThrow(ForbiddenException);
  });

  it('maps batch detail to response dto', async () => {
    omrRepository.findBatchById.mockResolvedValue({
      id: 'batch-1',
      teacherId: 'teacher-1',
    });
    omrRepository.findTeacherBatchById.mockResolvedValue(buildBatch());

    const result = await service.getTeacherBatchById('batch-1', 'teacher-1');

    expect(result.status).toBe(OmrBatchStatus.COMPLETED);
    expect(result.progressPercentage).toBe(100);
    expect(result.submissions[0]).toMatchObject({
      id: 'submission-1',
      studentName: 'Student One',
      status: SubmissionStatus.GRADED,
      score: 7.5,
      maxScore: 10,
    });
  });
});

function buildBatch() {
  return {
    id: 'batch-1',
    examId: 'exam-1',
    teacherId: 'teacher-1',
    status: OmrBatchStatus.COMPLETED,
    totalFiles: 1,
    processedFiles: 1,
    successCount: 1,
    failedCount: 0,
    completedAt: new Date('2026-04-14T10:00:00.000Z'),
    createdAt: new Date('2026-04-14T09:59:00.000Z'),
    updatedAt: new Date('2026-04-14T10:00:00.000Z'),
    exam: {
      maxScore: 10,
      answerKeys: [
        { questionNumber: 1, correctAnswer: AnswerChoice.A },
        { questionNumber: 2, correctAnswer: AnswerChoice.B },
      ],
    },
    submissions: [
      {
        id: 'submission-1',
        studentId: 'student-1',
        studentCode: 'STU-001',
        imageUrl: 'https://example.com/file.png',
        status: SubmissionStatus.GRADED,
        student: {
          id: 'student-1',
          name: 'Student One',
          studentCode: 'STU-001',
        },
        details: [
          {
            questionNumber: 1,
            detectedAnswer: AnswerChoice.A,
            finalAnswer: AnswerChoice.A,
            needsReview: false,
          },
          {
            questionNumber: 2,
            detectedAnswer: AnswerChoice.B,
            finalAnswer: AnswerChoice.B,
            needsReview: false,
          },
        ],
      },
    ],
  };
}
