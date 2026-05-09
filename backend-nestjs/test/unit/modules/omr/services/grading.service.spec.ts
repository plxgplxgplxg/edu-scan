import { UnprocessableEntityException } from '@nestjs/common';
import {
  AnswerChoice,
  SubmissionStatus,
  TestCodeResolutionStatus,
} from '@prisma/client';
import { GradingService } from '../../../../../src/modules/omr/services/grading.service';

describe('GradingService', () => {
  let service: GradingService;

  beforeEach(() => {
    service = new GradingService();
  });

  it('prepares a graded submission when payload is complete', () => {
    const answerKeys = buildAnswerKeys();
    const submission = service.prepareSubmission(
      answerKeys,
      {
        studentCode: 'stu-001',
        answers: [
          { questionNumber: 1, detectedAnswer: AnswerChoice.A },
          { questionNumber: 2, detectedAnswer: AnswerChoice.B },
        ],
      },
      TestCodeResolutionStatus.MATCHED,
    );

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
    const submission = service.prepareSubmission(
      buildAnswerKeys(),
      {
        studentCode: null,
        answers: [
          { questionNumber: 1, detectedAnswer: AnswerChoice.A },
          { questionNumber: 2, detectedAnswer: AnswerChoice.B },
        ],
      },
      TestCodeResolutionStatus.MATCHED,
    );

    expect(submission.status).toBe(SubmissionStatus.NEEDS_REVIEW);
    expect(submission.needsReview).toBe(true);
  });

  it('rejects duplicated question numbers from omr payload', () => {
    expect(() =>
      service.prepareSubmission(
        buildAnswerKeys(),
        {
          studentCode: 'STU-001',
          answers: [
            { questionNumber: 1, detectedAnswer: AnswerChoice.A },
            { questionNumber: 1, detectedAnswer: AnswerChoice.B },
          ],
        },
        TestCodeResolutionStatus.MATCHED,
      ),
    ).toThrow(UnprocessableEntityException);
  });

  it('ignores question numbers outside the answer key and keeps authoritative questions', () => {
    const submission = service.prepareSubmission(
      buildAnswerKeys(),
      {
        studentCode: 'STU-001',
        answers: [{ questionNumber: 3, detectedAnswer: AnswerChoice.A }],
      },
      TestCodeResolutionStatus.MATCHED,
    );

    expect(submission.status).toBe(SubmissionStatus.NEEDS_REVIEW);
    expect(submission.details).toEqual([
      {
        questionNumber: 1,
        detectedAnswer: null,
        finalAnswer: null,
        needsReview: true,
        reviewReason: 'LOW_CONFIDENCE',
      },
      {
        questionNumber: 2,
        detectedAnswer: null,
        finalAnswer: null,
        needsReview: true,
        reviewReason: 'LOW_CONFIDENCE',
      },
    ]);
  });

  it('calculates score from answer keys and final answers', () => {
    const score = service.calculateScore(
      buildAnswerKeys(),
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
    const submission = service.prepareSubmission(
      buildAnswerKeys(),
      {
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
      },
      TestCodeResolutionStatus.MATCHED,
    );

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
      const answerKeys = buildAnswerKeys(questionCount);
      const submission = service.prepareSubmission(
        answerKeys,
        {
          studentCode: 'STU-001',
          answers: answerKeys.map((item, index) => ({
            questionNumber: item.questionNumber,
            detectedAnswer:
              index % 2 === 0 ? item.correctAnswer : AnswerChoice.D,
            needsReview: false,
          })),
        },
        TestCodeResolutionStatus.MATCHED,
      );

      const summary = service.summarizeSubmission(
        answerKeys,
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

function buildAnswerKeys(questionCount = 2) {
  return Array.from({ length: questionCount }, (_, index) => ({
      questionNumber: index + 1,
      correctAnswer: [
        AnswerChoice.A,
        AnswerChoice.B,
        AnswerChoice.C,
        AnswerChoice.D,
      ][index % 4],
    }));
}
