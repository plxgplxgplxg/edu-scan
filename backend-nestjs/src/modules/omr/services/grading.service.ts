import {
  BadRequestException,
  Injectable,
  UnprocessableEntityException,
} from '@nestjs/common';
import { AnswerChoice, SubmissionStatus } from '@prisma/client';
import { OmrExam } from '../repositories/omr.repository';
import { OmrServiceResponse } from '../interfaces/omr-response.interface';

export type PreparedSubmissionDetail = {
  questionNumber: number;
  detectedAnswer: AnswerChoice | null;
  finalAnswer: AnswerChoice | null;
  needsReview: boolean;
};

export type PreparedSubmission = {
  studentCode: string | null;
  details: PreparedSubmissionDetail[];
  status: SubmissionStatus;
  needsReview: boolean;
};

@Injectable()
export class GradingService {
  prepareSubmission(
    exam: OmrExam,
    payload: OmrServiceResponse,
  ): PreparedSubmission {
    if (!Array.isArray(payload.answers) || payload.answers.length === 0) {
      throw new UnprocessableEntityException(
        'OMR result must contain at least one detected answer',
      );
    }

    const answerKeyNumbers = exam.answerKeys.map((item) => item.questionNumber);
    const answerNumberSet = new Set(answerKeyNumbers);
    const seenQuestionNumbers = new Set<number>();
    const payloadAnswerMap = new Map<
      number,
      { detectedAnswer: AnswerChoice | null; needsReview: boolean }
    >();

    for (const answer of payload.answers) {
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

      if (!answerNumberSet.has(answer.questionNumber)) {
        throw new UnprocessableEntityException(
          `OMR result contains unsupported questionNumber ${answer.questionNumber}`,
        );
      }

      seenQuestionNumbers.add(answer.questionNumber);
      payloadAnswerMap.set(answer.questionNumber, {
        detectedAnswer: answer.detectedAnswer ?? null,
        needsReview: Boolean(answer.needsReview),
      });
    }

    const normalizedStudentCode = this.normalizeStudentCode(
      payload.studentCode,
    );

    const details = answerKeyNumbers.map((questionNumber) => {
      const answer = payloadAnswerMap.get(questionNumber);
      const detectedAnswer = answer?.detectedAnswer ?? null;
      const needsReview =
        Boolean(payload.needsReview) ||
        Boolean(answer?.needsReview) ||
        detectedAnswer === null;

      return {
        questionNumber,
        detectedAnswer,
        finalAnswer: detectedAnswer,
        needsReview,
      };
    });

    const submissionNeedsReview =
      details.some((item) => item.needsReview) || !normalizedStudentCode;

    return {
      studentCode: normalizedStudentCode,
      details,
      status: submissionNeedsReview
        ? SubmissionStatus.NEEDS_REVIEW
        : SubmissionStatus.GRADED,
      needsReview: submissionNeedsReview,
    };
  }

  calculateScore(
    answerKeys: Array<{ questionNumber: number; correctAnswer: AnswerChoice }>,
    details: PreparedSubmissionDetail[],
    maxScore: number,
  ) {
    if (answerKeys.length === 0) {
      throw new BadRequestException('Exam answer key is empty');
    }

    const detailMap = new Map(
      details.map((item) => [item.questionNumber, item.finalAnswer]),
    );
    const pointsPerQuestion = maxScore / answerKeys.length;

    return answerKeys.reduce((total, answerKey) => {
      const finalAnswer = detailMap.get(answerKey.questionNumber);
      if (finalAnswer === answerKey.correctAnswer) {
        return total + pointsPerQuestion;
      }

      return total;
    }, 0);
  }

  private normalizeStudentCode(studentCode: string | null | undefined) {
    const normalized = studentCode?.trim().toUpperCase();
    return normalized || null;
  }
}
