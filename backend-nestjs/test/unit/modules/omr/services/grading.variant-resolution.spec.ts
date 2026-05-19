import { AnswerChoice, TestCodeResolutionStatus } from '@prisma/client';
import { GradingService } from '../../../../../src/modules/omr/services/grading.service';

describe('GradingService', () => {
  const service = new GradingService();

  const exam = {
    id: 'exam-1',
    variants: [
      {
        id: 'variant-a01',
        testCode: 'A01',
        answerKeys: Array.from({ length: 15 }, (_, index) => ({
          questionNumber: index + 1,
          correctAnswer: AnswerChoice.A,
        })),
      },
      {
        id: 'variant-b02',
        testCode: 'B02',
        answerKeys: Array.from({ length: 30 }, (_, index) => ({
          questionNumber: index + 1,
          correctAnswer: index % 2 === 0 ? AnswerChoice.B : AnswerChoice.C,
        })),
      },
    ],
  };

  it('resolves detected testId to the correct variant', () => {
    expect(service.resolveVariant(exam as never, ' b02 ')).toEqual({
      detectedTestId: 'B02',
      resolvedVariantId: 'variant-b02',
      resolvedTestCode: 'B02',
      status: TestCodeResolutionStatus.MATCHED,
    });
  });

  it('marks unknown testId for review', () => {
    expect(service.resolveVariant(exam as never, 'c03').status).toBe(
      TestCodeResolutionStatus.UNKNOWN_TEST_CODE,
    );
  });

  it('marks missing testId for review', () => {
    expect(service.resolveVariant(exam as never, null).status).toBe(
      TestCodeResolutionStatus.MISSING_TEST_CODE,
    );
  });

  it('grades only within the resolved variant question range', () => {
    const payload = {
      studentCode: 'S001',
      testId: 'A01',
      needsReview: false,
      answers: Array.from({ length: 60 }, (_, index) => ({
        questionNumber: index + 1,
        detectedAnswer: index < 15 ? 'A' : 'D',
        needsReview: false,
        reviewReason: null,
      })),
    };

    const prepared = service.prepareSubmission(
      exam.variants[0].answerKeys,
      payload,
      TestCodeResolutionStatus.MATCHED,
    );
    const summary = service.summarizeSubmission(
      exam.variants[0].answerKeys,
      prepared.details,
      10,
    );

    expect(prepared.details).toHaveLength(15);
    expect(summary.correctCount).toBe(15);
    expect(summary.wrongCount).toBe(0);
    expect(summary.reviewCount).toBe(0);
    expect(summary.score).toBeCloseTo(10);
  });
});
