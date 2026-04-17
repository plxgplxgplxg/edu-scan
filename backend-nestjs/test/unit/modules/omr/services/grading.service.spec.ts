import { UnprocessableEntityException } from '@nestjs/common';
import { AnswerChoice, SubmissionStatus } from '@prisma/client';
import { GradingService } from '../../../../../src/modules/omr/services/grading.service';

describe('GradingService', () => {
  let service: GradingService;

  beforeEach(() => {
    service = new GradingService();
  });

  it('prepares a graded submission when payload is complete', () => {
    const submission = service.prepareSubmission(buildExam(), {
      studentCode: 'stu-001',
      answers: [
        { questionNumber: 1, detectedAnswer: AnswerChoice.A },
        { questionNumber: 2, detectedAnswer: AnswerChoice.B },
      ],
    });

    expect(submission.studentCode).toBe('STU-001');
    expect(submission.status).toBe(SubmissionStatus.GRADED);
    expect(submission.needsReview).toBe(false);
    expect(submission.details).toEqual([
      {
        questionNumber: 1,
        detectedAnswer: AnswerChoice.A,
        finalAnswer: AnswerChoice.A,
        needsReview: false,
        reviewReason: null,
      },
      {
        questionNumber: 2,
        detectedAnswer: AnswerChoice.B,
        finalAnswer: AnswerChoice.B,
        needsReview: false,
        reviewReason: null,
      },
    ]);
  });

  it('marks submission as needs review when student code is missing', () => {
    const submission = service.prepareSubmission(buildExam(), {
      studentCode: null,
      answers: [
        { questionNumber: 1, detectedAnswer: AnswerChoice.A },
        { questionNumber: 2, detectedAnswer: AnswerChoice.B },
      ],
    });

    expect(submission.status).toBe(SubmissionStatus.NEEDS_REVIEW);
    expect(submission.needsReview).toBe(true);
  });

  it('rejects duplicated question numbers from omr payload', () => {
    expect(() =>
      service.prepareSubmission(buildExam(), {
        studentCode: 'STU-001',
        answers: [
          { questionNumber: 1, detectedAnswer: AnswerChoice.A },
          { questionNumber: 1, detectedAnswer: AnswerChoice.B },
        ],
      }),
    ).toThrow(UnprocessableEntityException);
  });

  it('rejects question numbers outside the answer key', () => {
    expect(() =>
      service.prepareSubmission(buildExam(), {
        studentCode: 'STU-001',
        answers: [{ questionNumber: 3, detectedAnswer: AnswerChoice.A }],
      }),
    ).toThrow(UnprocessableEntityException);
  });

  it('calculates score from answer keys and final answers', () => {
    const score = service.calculateScore(
      buildExam().answerKeys,
      [
        {
          questionNumber: 1,
          detectedAnswer: AnswerChoice.A,
          finalAnswer: AnswerChoice.A,
          needsReview: false,
          reviewReason: null,
        },
        {
          questionNumber: 2,
          detectedAnswer: AnswerChoice.C,
          finalAnswer: AnswerChoice.C,
          needsReview: false,
          reviewReason: null,
        },
      ],
      10,
    );

    expect(score).toBe(5);
  });

  it('preserves per-question review reason from omr payload', () => {
    const submission = service.prepareSubmission(buildExam(), {
      studentCode: 'STU-001',
      answers: [
        {
          questionNumber: 1,
          detectedAnswer: 'AB',
          needsReview: true,
          reviewReason: 'MULTI_MARK',
        },
        {
          questionNumber: 2,
          detectedAnswer: AnswerChoice.B,
          needsReview: false,
        },
      ],
    });

    expect(submission.details[0]).toMatchObject({
      questionNumber: 1,
      detectedAnswer: 'AB',
      finalAnswer: null,
      needsReview: true,
      reviewReason: 'MULTI_MARK',
    });
  });

  it.each([15, 30, 60])(
    'scores only the first %i exam questions for a larger template response',
    (questionCount) => {
      const exam = buildExam(questionCount);
      const submission = service.prepareSubmission(exam, {
        studentCode: 'STU-001',
        answers: exam.answerKeys.map((item, index) => ({
          questionNumber: item.questionNumber,
          detectedAnswer: index % 2 === 0 ? item.correctAnswer : AnswerChoice.D,
          needsReview: false,
        })),
      });

      const summary = service.summarizeSubmission(
        exam.answerKeys,
        submission.details,
        questionCount,
      );

      expect(submission.details).toHaveLength(questionCount);
      expect(
        summary.correctCount + summary.wrongCount + summary.reviewCount,
      ).toBe(questionCount);
    },
  );
});

function buildExam(questionCount = 2) {
  return {
    id: 'exam-1',
    answerKeys: Array.from({ length: questionCount }, (_, index) => ({
      questionNumber: index + 1,
      correctAnswer:
        [AnswerChoice.A, AnswerChoice.B, AnswerChoice.C, AnswerChoice.D][
          index % 4
        ],
    })),
    classes: [],
  } as never;
}
