import { ForbiddenException, NotFoundException } from '@nestjs/common';
import {
  AnswerChoice,
  OmrBatchStatus,
  SubmissionStatus,
  TestCodeResolutionStatus,
} from '@prisma/client';
import { BatchService } from '../../../../../src/modules/omr/services/batch.service';

describe('BatchService', () => {
  let service: BatchService;

  const omrRepository = {
    createBatch: jest.fn(),
    markBatchStatus: jest.fn(),
    recordSuccessfulFile: jest.fn(),
    recordFailedFile: jest.fn(),
    findBatchById: jest.fn(),
    findBatchAccessById: jest.fn(),
    findBatchSubmissionsPaginated: jest.fn(),
    findTeacherBatchById: jest.fn(),
    findTeacherSubmissionById: jest.fn(),
  };

  const eventEmitter = {
    emit: jest.fn(),
  };
  const sseRegistryService = {
    emit: jest.fn(),
    complete: jest.fn(),
  };

  const gradingService = {
    calculateScore: jest.fn(),
    summarizeSubmission: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    service = new BatchService(
      omrRepository as never,
      gradingService as never,
      eventEmitter as never,
      sseRegistryService as never,
    );
    gradingService.calculateScore.mockReturnValue(7.5);
    gradingService.summarizeSubmission.mockReturnValue({
      score: 7.5,
      maxScore: 10,
      correctCount: 1,
      wrongCount: 1,
      reviewCount: 0,
      gradedAt: new Date(),
    });
  });

  it('throws not found when batch does not exist', async () => {
    omrRepository.findBatchAccessById.mockResolvedValue(null);

    await expect(
      service.getTeacherBatchById('batch-1', 'teacher-1'),
    ).rejects.toThrow(NotFoundException);
  });

  it('throws forbidden when batch belongs to another teacher', async () => {
    omrRepository.findBatchAccessById.mockResolvedValue({
      id: 'batch-1',
      teacherId: 'teacher-2',
    });

    await expect(
      service.getTeacherBatchById('batch-1', 'teacher-1'),
    ).rejects.toThrow(ForbiddenException);
  });

  it('maps batch detail to response dto', async () => {
    omrRepository.findBatchAccessById.mockResolvedValue({
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
      correctCount: 1,
      wrongCount: 1,
      reviewCount: 0,
      annotatedImageUrl: 'https://example.com/annotated.png',
    });
  });

  it('returns lightweight paginated OMR rows without loading answer details', async () => {
    omrRepository.findBatchAccessById.mockResolvedValue({
      id: 'batch-1',
      teacherId: 'teacher-1',
    });
    omrRepository.findBatchSubmissionsPaginated.mockResolvedValue({
      total: 1,
      items: [
        {
          id: 'submission-1',
          studentId: 'student-1',
          studentCode: 'STU-001',
          detectedTestId: '101',
          resolvedTestCode: '101',
          status: SubmissionStatus.GRADED,
          score: 7.5,
          maxScore: 10,
          correctCount: 45,
          wrongCount: 15,
          reviewCount: 0,
          student: { name: 'Student One' },
          _count: { details: 60 },
        },
      ],
    });

    const result = await service.getTeacherBatchSubmissions(
      'batch-1',
      'teacher-1',
      1,
      20,
    );

    expect(result).toMatchObject({
      total: 1,
      totalPages: 1,
      items: [
        {
          id: 'submission-1',
          studentName: 'Student One',
          questionCount: 60,
        },
      ],
    });
    expect(result.items[0]).not.toHaveProperty('details');
    expect(omrRepository.findBatchById).not.toHaveBeenCalled();
  });

  it('maps submission detail response with artifact urls and review reason', async () => {
    omrRepository.findTeacherSubmissionById.mockResolvedValue({
      ...buildBatch().submissions[0],
      examId: 'exam-1',
      batchId: 'batch-1',
      exam: buildBatch().exam,
      createdAt: new Date('2026-04-14T10:00:00.000Z'),
      updatedAt: new Date('2026-04-14T10:00:00.000Z'),
    });

    const result = await service.getTeacherSubmissionById(
      'submission-1',
      'teacher-1',
    );

    expect(result).toMatchObject({
      id: 'submission-1',
      imageUrl: 'https://example.com/file.png',
      annotatedImageUrl: 'https://example.com/annotated.png',
      correctCount: 1,
      wrongCount: 1,
      reviewCount: 0,
    });
    expect(result.details[1]).toMatchObject({
      questionNumber: 2,
      correctAnswer: AnswerChoice.B,
      detectedAnswer: AnswerChoice.B,
      finalAnswer: AnswerChoice.C,
      isCorrect: false,
      reviewReason: undefined,
    });
  });

  it('emits completion event when successful file completes batch', async () => {
    omrRepository.recordSuccessfulFile.mockResolvedValue({
      id: 'batch-1',
      status: OmrBatchStatus.COMPLETED,
      processedFiles: 1,
      totalFiles: 1,
    });

    await service.recordSuccessfulFile({
      batchId: 'batch-1',
      examId: 'exam-1',
      resolvedVariantId: null,
      imageUrl: 'https://example.com/file.png',
      studentId: null,
      studentCode: null,
      studentCodeRaw: null,
      matchedStudentId: null,
      isExternal: false,
      detectedTestId: null,
      resolvedTestCode: null,
      testCodeResolutionStatus: TestCodeResolutionStatus.MISSING_TEST_CODE,
      status: SubmissionStatus.NEEDS_REVIEW,
      score: 0,
      maxScore: 10,
      correctCount: 0,
      wrongCount: 0,
      reviewCount: 0,
      gradedAt: new Date(),
      details: [],
    });

    expect(eventEmitter.emit).toHaveBeenCalledWith('omr.batch.completed', {
      batchId: 'batch-1',
      status: OmrBatchStatus.COMPLETED,
    });
    expect(sseRegistryService.emit).toHaveBeenCalledWith(
      'omr:batch-1',
      expect.objectContaining({
        type: 'batch:completed',
        batchId: 'batch-1',
        pct: 100,
      }),
    );
    expect(sseRegistryService.complete).toHaveBeenCalledWith('omr:batch-1');
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
        processedImageUrl: 'https://example.com/processed.png',
        annotatedImageUrl: 'https://example.com/annotated.png',
        warpOverlayUrl: 'https://example.com/warp.png',
        answerScoresUrl: 'https://example.com/scores.json',
        status: SubmissionStatus.GRADED,
        score: 7.5,
        maxScore: 10,
        correctCount: 1,
        wrongCount: 1,
        reviewCount: 0,
        gradedAt: new Date('2026-04-14T10:00:00.000Z'),
        student: {
          id: 'student-1',
          name: 'Student One',
          studentCode: 'STU-001',
        },
        resolvedVariant: {
          answerKeys: [
            { questionNumber: 1, correctAnswer: AnswerChoice.A },
            { questionNumber: 2, correctAnswer: AnswerChoice.B },
          ],
        },
        details: [
          {
            questionNumber: 1,
            detectedAnswer: AnswerChoice.A,
            finalAnswer: AnswerChoice.A,
            needsReview: false,
            reviewReason: null,
            correctAnswer: AnswerChoice.A,
            isCorrect: true,
          },
          {
            questionNumber: 2,
            detectedAnswer: AnswerChoice.B,
            finalAnswer: AnswerChoice.C,
            needsReview: false,
            reviewReason: null,
            correctAnswer: AnswerChoice.B,
            isCorrect: false,
          },
        ],
      },
    ],
  };
}
