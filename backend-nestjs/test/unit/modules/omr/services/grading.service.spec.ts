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
      },
      {
        questionNumber: 2,
        detectedAnswer: AnswerChoice.B,
        finalAnswer: AnswerChoice.B,
        needsReview: false,
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
        },
        {
          questionNumber: 2,
          detectedAnswer: AnswerChoice.C,
          finalAnswer: AnswerChoice.C,
          needsReview: false,
        },
      ],
      10,
    );

    expect(score).toBe(5);
  });
});

function buildExam() {
  return {
    id: 'exam-1',
    answerKeys: [
      { questionNumber: 1, correctAnswer: AnswerChoice.A },
      { questionNumber: 2, correctAnswer: AnswerChoice.B },
    ],
    classes: [],
  } as never;
}
