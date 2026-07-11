import {
  BadRequestException,
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { SubmissionsRepository } from '../repositories/submissions.repository';
import { GetSubmissionsQueryDto } from '../dtos/get-submissions-query.dto';
import { UpdateSubmissionOverrideDto } from '../dtos/update-override.dto';
import { UpdateSubmissionAnswersDto } from '../dtos/update-submission-answers.dto';
import {
  Role,
  TestCodeResolutionStatus,
  AnswerChoice,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../../../database/prisma.service';
@Injectable()
export class SubmissionsService {
  constructor(
    private readonly submissionsRepository: SubmissionsRepository,
    private readonly prisma: PrismaService,
  ) {}

  async findAll(query: GetSubmissionsQueryDto) {
    const filter = { ...query };
    return this.submissionsRepository.findAll(filter);
  }

  async findOneWithScore(
    id: string,
    requestUser: { id: string; role: string },
  ) {
    const submission = await this.submissionsRepository.findOneWithDetails(id);

    if (!submission) {
      throw new NotFoundException('Submission not found');
    }

    if (
      requestUser.role === Role.STUDENT &&
      submission.studentId !== requestUser.id
    ) {
      throw new ForbiddenException('You can only access your own submissions');
    }

    const score = this.calculateSubmissionScore(submission);
    const answerKeysMap = score.answerKeysMap;

    const processedDetails = submission.details.map((detail) => {
      const correctAnswer = answerKeysMap.get(detail.questionNumber);
      const isCorrect = correctAnswer && detail.finalAnswer === correctAnswer;
      return {
        ...detail,
        isCorrect,
        correctAnswer,
      };
    });

    return {
      ...submission,
      details: processedDetails,
      score: {
        totalCorrect: score.totalCorrect,
        maxScore: score.maxScore,
        calculatedScore: score.calculatedScore,
      },
    };
  }

  async manualOverride(id: string, dto: UpdateSubmissionOverrideDto) {
    const submission = await this.submissionsRepository.findOneWithDetails(id);

    if (!submission) {
      throw new NotFoundException('Submission not found');
    }

    await this.prisma.$transaction(async (tx) => {
      const updateData: Prisma.SubmissionUncheckedUpdateInput = {};
      let nextVariantId = submission.resolvedVariantId;

      if (dto.studentCode) {
        updateData.studentCode = dto.studentCode;
        const student = await tx.user.findUnique({
          where: { studentCode: dto.studentCode },
        });
        if (student) {
          updateData.studentId = student.id;
        }
      }

      if (dto.resolvedTestCode) {
        updateData.resolvedTestCode = dto.resolvedTestCode;
        // Find variant by test code
        const variant = await tx.examVariant.findFirst({
          where: { examId: submission.examId, testCode: dto.resolvedTestCode },
        });
        if (variant) {
          updateData.resolvedVariantId = variant.id;
          nextVariantId = variant.id;
        }
      } else if (dto.resolvedVariantId) {
        updateData.resolvedVariantId = dto.resolvedVariantId;
        nextVariantId = dto.resolvedVariantId;
      }

      if (dto.resolvedTestCode || dto.resolvedVariantId) {
        updateData.testCodeResolutionStatus = TestCodeResolutionStatus.MATCHED;
      }

      updateData.reviewedAt = new Date();

      await tx.submission.update({
        where: { id },
        data: updateData,
      });

      // Refetch resolved variant to get answer keys for recalculation
      const answerKeysMap = new Map<number, AnswerChoice>();
      if (nextVariantId) {
        const variant = await tx.examVariant.findUnique({
          where: { id: nextVariantId },
          include: { answerKeys: true },
        });
        if (variant) {
          for (const key of variant.answerKeys) {
            answerKeysMap.set(key.questionNumber, key.correctAnswer);
          }
        }
      }

      const detailUpdates = new Map<number, AnswerChoice>();
      if (dto.details && dto.details.length > 0) {
        for (const detail of dto.details) {
          detailUpdates.set(detail.questionNumber, detail.finalAnswer);
        }
      }

      const updatedDetails: Prisma.SubmissionDetailGetPayload<Prisma.SubmissionDetailDefaultArgs>[] =
        [];
      for (const existingDetail of submission.details) {
        const finalAnswer = detailUpdates.has(existingDetail.questionNumber)
          ? detailUpdates.get(existingDetail.questionNumber)!
          : existingDetail.finalAnswer;

        const correctAnswer =
          answerKeysMap.get(existingDetail.questionNumber) ?? null;
        const isCorrect =
          finalAnswer !== null &&
          correctAnswer !== null &&
          finalAnswer === correctAnswer;

        const updated = await tx.submissionDetail.update({
          where: {
            submissionId_questionNumber: {
              submissionId: id,
              questionNumber: existingDetail.questionNumber,
            },
          },
          data: {
            finalAnswer,
            isCorrect,
            needsReview: finalAnswer === null,
            reviewReason: finalAnswer === null ? 'MANUAL_BLANK' : null,
          },
        });
        updatedDetails.push(updated);
      }

      let correctCount = 0;
      let wrongCount = 0;
      let reviewCount = 0;

      for (const detail of updatedDetails) {
        if (detail.needsReview) {
          reviewCount += 1;
        } else if (detail.isCorrect) {
          correctCount += 1;
        } else {
          wrongCount += 1;
        }
      }

      const totalQuestions = answerKeysMap.size || updatedDetails.length;
      const score =
        totalQuestions > 0 && answerKeysMap.size > 0
          ? (correctCount / answerKeysMap.size) * submission.exam.maxScore
          : 0;

      const needsReview = updatedDetails.some((d) => d.needsReview);

      await tx.submission.update({
        where: { id },
        data: {
          correctCount,
          wrongCount,
          reviewCount,
          score,
          status: needsReview ? 'NEEDS_REVIEW' : 'GRADED',
        },
      });
    });

    return this.submissionsRepository.findOneWithDetails(id);
  }

  async updateSubmissionAnswers(id: string, dto: UpdateSubmissionAnswersDto) {
    const submission = await this.submissionsRepository.findOneWithDetails(id);

    if (!submission) {
      throw new NotFoundException('Submission not found');
    }

    const detailMap = new Map(
      submission.details.map((d) => [d.questionNumber, d]),
    );

    const answerKeysMap = new Map<number, AnswerChoice>();
    if (submission.resolvedVariant?.answerKeys) {
      for (const key of submission.resolvedVariant.answerKeys) {
        answerKeysMap.set(key.questionNumber, key.correctAnswer);
      }
    }

    await this.prisma.$transaction(async (tx) => {
      for (const patch of dto.answers) {
        const detail = detailMap.get(patch.questionNumber);
        if (!detail) {
          throw new BadRequestException(
            `Question number ${patch.questionNumber} does not exist in this submission`,
          );
        }

        const finalAnswer = patch.finalAnswer ?? null;
        const correctAnswer = answerKeysMap.get(patch.questionNumber) ?? null;
        const isCorrect =
          finalAnswer !== null &&
          correctAnswer !== null &&
          finalAnswer === correctAnswer;

        await tx.submissionDetail.update({
          where: {
            submissionId_questionNumber: {
              submissionId: id,
              questionNumber: patch.questionNumber,
            },
          },
          data: {
            finalAnswer,
            isCorrect,
            needsReview: finalAnswer === null,
            reviewReason: finalAnswer === null ? 'MANUAL_BLANK' : null,
          },
        });
      }

      const updatedDetails = await tx.submissionDetail.findMany({
        where: { submissionId: id },
      });

      let correctCount = 0;
      let wrongCount = 0;
      let reviewCount = 0;

      for (const detail of updatedDetails) {
        if (detail.needsReview) {
          reviewCount += 1;
        } else if (detail.isCorrect) {
          correctCount += 1;
        } else {
          wrongCount += 1;
        }
      }

      const totalQuestions = answerKeysMap.size || updatedDetails.length;
      const score =
        totalQuestions > 0 && answerKeysMap.size > 0
          ? (correctCount / answerKeysMap.size) * submission.exam.maxScore
          : 0;

      const needsReview = updatedDetails.some((d) => d.needsReview);

      await tx.submission.update({
        where: { id },
        data: {
          correctCount,
          wrongCount,
          reviewCount,
          score,
          reviewedAt: new Date(),
          status: needsReview ? 'NEEDS_REVIEW' : 'GRADED',
        },
      });
    });

    return this.submissionsRepository.findOneWithDetails(id);
  }

  private calculateSubmissionScore(submission: {
    exam: { maxScore: number };
    details: Array<{
      questionNumber: number;
      finalAnswer: AnswerChoice | null;
    }>;
    resolvedVariant?: {
      answerKeys: Array<{
        questionNumber: number;
        correctAnswer: AnswerChoice;
      }>;
    } | null;
  }) {
    const maxScore = submission.exam.maxScore;
    const totalQuestions = submission.details.length;
    let totalCorrect = 0;

    const answerKeysMap = new Map<number, AnswerChoice>();
    if (submission.resolvedVariant?.answerKeys) {
      for (const key of submission.resolvedVariant.answerKeys) {
        answerKeysMap.set(key.questionNumber, key.correctAnswer);
      }
    }

    for (const detail of submission.details) {
      const correctAnswer = answerKeysMap.get(detail.questionNumber);
      if (correctAnswer && detail.finalAnswer === correctAnswer) {
        totalCorrect++;
      }
    }

    const calculatedScore =
      totalQuestions > 0 && answerKeysMap.size > 0
        ? (totalCorrect / answerKeysMap.size) * maxScore
        : 0;

    return {
      totalCorrect,
      maxScore,
      totalQuestions,
      calculatedScore,
      answerKeysMap,
    };
  }
}
