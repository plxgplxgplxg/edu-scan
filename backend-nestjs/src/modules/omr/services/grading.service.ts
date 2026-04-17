import {
  BadRequestException,
  Injectable,
  UnprocessableEntityException,
} from '@nestjs/common';
import {
  AnswerChoice,
  SubmissionStatus,
  TestCodeResolutionStatus,
} from '@prisma/client';
import { OmrExam } from '../repositories/omr.repository';
import {
  OmrAnswerResult,
  OmrServiceResponse,
} from '../interfaces/omr-response.interface';

type VariantAnswerKey = Array<{
  questionNumber: number;
  correctAnswer: AnswerChoice;
}>;

export type PreparedSubmissionDetail = {
  questionNumber: number;
  detectedAnswer: string | null;
  finalAnswer: AnswerChoice | null;
  needsReview: boolean;
  reviewReason: string | null;
};

export type TestCodeResolution = {
  detectedTestId: string | null;
  resolvedVariantId: string | null;
  resolvedTestCode: string | null;
  status: TestCodeResolutionStatus;
};

export type PreparedSubmission = {
  studentCode: string | null;
  details: PreparedSubmissionDetail[];
  status: SubmissionStatus;
  needsReview: boolean;
};

@Injectable()
export class GradingService {
  resolveVariant(
    exam: OmrExam,
    detectedTestId: string | null | undefined,
  ): TestCodeResolution {
    const normalizedDetectedTestId = this.normalizeTestCode(detectedTestId);

    if (!normalizedDetectedTestId) {
      return {
        detectedTestId: null,
        resolvedVariantId: null,
        resolvedTestCode: null,
        status: TestCodeResolutionStatus.MISSING_TEST_CODE,
      };
    }

    const matches = exam.variants.filter(
      (variant) => variant.testCode === normalizedDetectedTestId,
    );

    if (matches.length > 1) {
      return {
        detectedTestId: normalizedDetectedTestId,
        resolvedVariantId: null,
        resolvedTestCode: null,
        status: TestCodeResolutionStatus.AMBIGUOUS_TEST_CODE,
      };
    }

    if (matches.length === 0) {
      return {
        detectedTestId: normalizedDetectedTestId,
        resolvedVariantId: null,
        resolvedTestCode: null,
        status: TestCodeResolutionStatus.UNKNOWN_TEST_CODE,
      };
    }

    return {
      detectedTestId: normalizedDetectedTestId,
      resolvedVariantId: matches[0].id,
      resolvedTestCode: matches[0].testCode,
      status: TestCodeResolutionStatus.MATCHED,
    };
  }

  prepareSubmission(
    answerKeys: VariantAnswerKey | null,
    payload: OmrServiceResponse,
    resolutionStatus: TestCodeResolutionStatus,
  ): PreparedSubmission {
    if (!Array.isArray(payload.answers) || payload.answers.length === 0) {
      throw new UnprocessableEntityException(
        'OMR result must contain at least one detected answer',
      );
    }

    const normalizedStudentCode = this.normalizeStudentCode(
      payload.studentCode,
    );
    const normalizedAnswers = this.normalizeDetectedAnswers(
      payload.answers,
      answerKeys,
    );

    const submissionNeedsReview =
      Boolean(payload.needsReview) ||
      resolutionStatus !== TestCodeResolutionStatus.MATCHED ||
      normalizedAnswers.some((item) => item.needsReview) ||
      !normalizedStudentCode;

    return {
      studentCode: normalizedStudentCode,
      details: normalizedAnswers,
      status: submissionNeedsReview
        ? SubmissionStatus.NEEDS_REVIEW
        : SubmissionStatus.GRADED,
      needsReview: submissionNeedsReview,
    };
  }

  calculateScore(
    answerKeys: VariantAnswerKey | null,
    details: PreparedSubmissionDetail[],
    maxScore: number,
  ) {
    if (!answerKeys || answerKeys.length === 0) {
      return 0;
    }

    const pointsPerQuestion = maxScore / answerKeys.length;

    return answerKeys.reduce((total, answerKey) => {
      const detail = details.find(
        (item) => item.questionNumber === answerKey.questionNumber,
      );
      if (
        detail &&
        !detail.needsReview &&
        detail.finalAnswer === answerKey.correctAnswer
      ) {
        return total + pointsPerQuestion;
      }

      return total;
    }, 0);
  }

  summarizeSubmission(
    answerKeys: VariantAnswerKey | null,
    details: PreparedSubmissionDetail[],
    maxScore: number,
  ) {
    if (!answerKeys || answerKeys.length === 0) {
      return {
        score: 0,
        maxScore,
        correctCount: 0,
        wrongCount: 0,
        reviewCount: details.length,
      };
    }

    const answerKeyMap = new Map(
      answerKeys.map((item) => [item.questionNumber, item.correctAnswer]),
    );
    let correctCount = 0;
    let wrongCount = 0;
    let reviewCount = 0;

    for (const detail of details) {
      const correctAnswer = answerKeyMap.get(detail.questionNumber);
      if (!correctAnswer) {
        continue;
      }

      if (detail.needsReview) {
        reviewCount += 1;
        continue;
      }

      if (detail.finalAnswer === correctAnswer) {
        correctCount += 1;
      } else {
        wrongCount += 1;
      }
    }

    return {
      score: this.calculateScore(answerKeys, details, maxScore),
      maxScore,
      correctCount,
      wrongCount,
      reviewCount,
    };
  }

  buildOverlayAnswerKey(
    answerKeys: VariantAnswerKey,
    details: PreparedSubmissionDetail[],
  ) {
    return answerKeys.map((answerKey) => ({
      questionNumber: answerKey.questionNumber,
      correctAnswer: answerKey.correctAnswer,
      detectedAnswer:
        details.find((item) => item.questionNumber === answerKey.questionNumber)
          ?.detectedAnswer ?? null,
    }));
  }

  private normalizeDetectedAnswers(
    answers: OmrAnswerResult[],
    answerKeys: VariantAnswerKey | null,
  ): PreparedSubmissionDetail[] {
    const answerKeyNumbers =
      answerKeys?.map((item) => item.questionNumber) ?? [];
    const answerNumberSet = new Set(answerKeyNumbers);
    const seenQuestionNumbers = new Set<number>();
    const payloadAnswerMap = new Map<
      number,
      {
        detectedAnswer: string | null;
        needsReview: boolean;
        reviewReason: string | null;
      }
    >();

    for (const answer of answers) {
      if (
        !Number.isInteger(answer.questionNumber) ||
        answer.questionNumber <= 0
      ) {
        throw new UnprocessableEntityException(
          'OMR result contains invalid questionNumber',
        );
      }

      if (seenQuestionNumbers.has(answer.questionNumber)) {
        throw new UnprocessableEntityException(
          `OMR result contains duplicated questionNumber ${answer.questionNumber}`,
        );
      }

      seenQuestionNumbers.add(answer.questionNumber);
      if (answerKeys && !answerNumberSet.has(answer.questionNumber)) {
        continue;
      }

      payloadAnswerMap.set(answer.questionNumber, {
        detectedAnswer: answer.detectedAnswer ?? null,
        needsReview: Boolean(answer.needsReview),
        reviewReason: this.normalizeReviewReason(answer.reviewReason),
      });
    }

    const authoritativeQuestionNumbers =
      answerKeys?.map((item) => item.questionNumber) ??
      [...payloadAnswerMap.keys()].sort((left, right) => left - right);

    return authoritativeQuestionNumbers.map((questionNumber) => {
      const answer = payloadAnswerMap.get(questionNumber);
      const detectedAnswer = this.normalizeDetectedAnswer(
        answer?.detectedAnswer ?? null,
      );
      const finalAnswer = this.normalizeFinalAnswer(detectedAnswer);
      const needsReview = Boolean(answer?.needsReview) || finalAnswer === null;
      const reviewReason =
        answer?.reviewReason ??
        (finalAnswer === null ? 'LOW_CONFIDENCE' : null);

      return {
        questionNumber,
        detectedAnswer,
        finalAnswer,
        needsReview,
        reviewReason,
      };
    });
  }

  private normalizeStudentCode(studentCode: string | null | undefined) {
    const normalized = studentCode?.trim().toUpperCase();
    return normalized || null;
  }

  private normalizeDetectedAnswer(detectedAnswer: string | null | undefined) {
    const normalized = detectedAnswer?.trim().toUpperCase();
    return normalized || null;
  }

  private normalizeFinalAnswer(
    detectedAnswer: string | null,
  ): AnswerChoice | null {
    if (
      detectedAnswer === AnswerChoice.A ||
      detectedAnswer === AnswerChoice.B ||
      detectedAnswer === AnswerChoice.C ||
      detectedAnswer === AnswerChoice.D
    ) {
      return detectedAnswer;
    }

    return null;
  }

  private normalizeReviewReason(reviewReason: string | null | undefined) {
    const normalized = reviewReason?.trim().toUpperCase();
    return normalized || null;
  }

  private normalizeTestCode(testCode: string | null | undefined) {
    const normalized = testCode?.trim().toUpperCase();
    return normalized || null;
  }
}
