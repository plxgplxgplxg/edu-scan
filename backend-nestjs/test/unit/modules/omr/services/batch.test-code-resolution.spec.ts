import {
  OmrBatchStatus,
  SubmissionStatus,
  TestCodeResolutionStatus,
} from '@prisma/client';
import { BatchService } from '../../../../../src/modules/omr/services/batch.service';
import { GradingService } from '../../../../../src/modules/omr/services/grading.service';

describe('BatchService', () => {
  const omrRepository = {
    createBatch: jest.fn(),
    markBatchStatus: jest.fn(),
    recordSuccessfulFile: jest.fn(),
    recordFailedFile: jest.fn(),
    findBatchById: jest.fn(),
    findTeacherBatchById: jest.fn(),
    findTeacherSubmissionById: jest.fn(),
  };

  let service: BatchService;
  const eventEmitter = {
    emit: jest.fn(),
  };
  const sseRegistryService = {
    emit: jest.fn(),
    complete: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    service = new BatchService(
      omrRepository as never,
      new GradingService(),
      eventEmitter as never,
      sseRegistryService as never,
    );
  });

  it('returns test-code resolution fields in batch list', async () => {
    const batch = buildBatchEntity();
    omrRepository.findBatchById.mockResolvedValue({
      id: batch.id,
      teacherId: 'teacher-1',
    });
    omrRepository.findTeacherBatchById.mockResolvedValue(batch);

    const result = await service.getTeacherBatchById(batch.id, 'teacher-1');

    expect(result.submissions[0]).toMatchObject({
      detectedTestId: 'B02',
      resolvedTestCode: 'B02',
      resolvedVariantId: 'variant-b02',
      testCodeResolutionStatus: TestCodeResolutionStatus.MATCHED,
      score: 10,
      correctCount: 30,
      reviewCount: 0,
    });
  });

  it('returns unresolved test-code info in submission detail', async () => {
    const submission = buildSubmissionEntity({
      resolvedVariantId: null,
      resolvedVariant: null,
      detectedTestId: 'Z99',
      resolvedTestCode: null,
      testCodeResolutionStatus: TestCodeResolutionStatus.UNKNOWN_TEST_CODE,
      details: [
        {
          questionNumber: 1,
          detectedAnswer: 'A',
          finalAnswer: 'A',
          needsReview: true,
          reviewReason: null,
        },
      ],
    });
    omrRepository.findTeacherSubmissionById.mockResolvedValue(submission);

    const result = await service.getTeacherSubmissionById(
      submission.id,
      'teacher-1',
    );

    expect(result).toMatchObject({
      detectedTestId: 'Z99',
      resolvedTestCode: null,
      testCodeResolutionStatus: TestCodeResolutionStatus.UNKNOWN_TEST_CODE,
      reviewCount: 1,
    });
    expect(result.details[0].reviewReason).toBe('UNKNOWN_TEST_CODE');
  });
});

function buildBatchEntity() {
  return {
    id: 'batch-1',
    examId: 'exam-1',
    teacherId: 'teacher-1',
    status: OmrBatchStatus.COMPLETED,
    totalFiles: 1,
    processedFiles: 1,
    successCount: 1,
    failedCount: 0,
    completedAt: new Date('2026-04-17T00:00:00.000Z'),
    createdAt: new Date('2026-04-17T00:00:00.000Z'),
    updatedAt: new Date('2026-04-17T00:00:00.000Z'),
    exam: {
      id: 'exam-1',
      maxScore: 10,
      variants: [],
    },
    submissions: [buildSubmissionEntity()],
  };
}

function buildSubmissionEntity(
  overrides: Partial<Record<string, unknown>> = {},
) {
  return {
    id: 'submission-1',
    examId: 'exam-1',
    batchId: 'batch-1',
    studentId: 'student-1',
    studentCode: 'S001',
    detectedTestId: 'B02',
    resolvedTestCode: 'B02',
    resolvedVariantId: 'variant-b02',
    testCodeResolutionStatus: TestCodeResolutionStatus.MATCHED,
    imageUrl: 'https://example.com/original.png',
    processedImageUrl: 'https://example.com/processed.png',
    annotatedImageUrl: 'https://example.com/annotated.png',
    warpOverlayUrl: 'https://example.com/warp.png',
    answerScoresUrl: 'https://example.com/scores.json',
    status: SubmissionStatus.GRADED,
    createdAt: new Date('2026-04-17T00:00:00.000Z'),
    updatedAt: new Date('2026-04-17T00:00:00.000Z'),
    student: {
      id: 'student-1',
      name: 'Student',
      studentCode: 'S001',
    },
    exam: {
      id: 'exam-1',
      maxScore: 10,
      variants: [],
    },
    resolvedVariant: {
      id: 'variant-b02',
      testCode: 'B02',
      answerKeys: Array.from({ length: 30 }, (_, index) => ({
        questionNumber: index + 1,
        correctAnswer: 'A',
      })),
    },
    details: Array.from({ length: 30 }, (_, index) => ({
      questionNumber: index + 1,
      detectedAnswer: 'A',
      finalAnswer: 'A',
      needsReview: false,
      reviewReason: null,
    })),
    ...overrides,
  };
}
