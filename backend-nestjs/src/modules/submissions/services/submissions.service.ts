import {
  BadRequestException,
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { SubmissionsRepository } from '../repositories/submissions.repository';
import { GetSubmissionsQueryDto } from '../dtos/get-submissions-query.dto';
import { UpdateSubmissionOverrideDto } from '../dtos/update-override.dto';
import { QueryMySubmissionsDto } from '../dtos/query-my-submissions.dto';
import {
  ClassExamSubmissionStatus,
  Role,
  SubmissionStatus,
  TestCodeResolutionStatus,
  AnswerChoice,
  QuestionType,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../../../database/prisma.service';
import { OnEvent } from '@nestjs/event-emitter';
import { RemarkApprovedEvent } from '../../remarks/events/remark-approved.event';
import { EventEmitter2 } from '@nestjs/event-emitter';
@Injectable()
export class SubmissionsService {
  constructor(
    private readonly submissionsRepository: SubmissionsRepository,
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
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

  async findMySubmissions(
    requestUser: { id: string; role: string },
    query: QueryMySubmissionsDto,
  ) {
    this.assertStudentRequest(requestUser);

    const page = Math.max(1, query.page ?? 1);
    const limit = Math.min(100, Math.max(1, query.limit ?? 20));

    const [items, total] = await Promise.all([
      this.submissionsRepository.findStudentSubmissionsPaginated({
        studentId: requestUser.id,
        examId: query.examId,
        classId: query.classId,
        status: query.status,
        page,
        limit,
      }),
      this.submissionsRepository.countStudentSubmissions({
        studentId: requestUser.id,
        examId: query.examId,
        classId: query.classId,
        status: query.status,
      }),
    ]);

    return {
      items: items.map((submission) => {
        const score = this.calculateSubmissionScore(submission);
        const needsReview = submission.status === SubmissionStatus.NEEDS_REVIEW;
        return {
          id: submission.id,
          examId: submission.examId,
          examTitle: submission.exam.title,
          status: submission.status,
          createdAt: submission.createdAt,
          reviewedAt: submission.reviewedAt,
          score: score.calculatedScore,
          maxScore: score.maxScore,
          totalCorrect: score.totalCorrect,
          totalQuestions: score.totalQuestions,
          needsReview,
          reviewNote: needsReview ? 'Pending manual review' : null,
        };
      }),
      total,
      page,
      limit,
      totalPages: total === 0 ? 0 : Math.ceil(total / limit),
    };
  }

  async getMyProgress(requestUser: { id: string; role: string }) {
    this.assertStudentRequest(requestUser);

    const submissions =
      await this.submissionsRepository.findStudentSubmissionsForProgress(
        requestUser.id,
      );

    return submissions.map((submission) => {
      const score = this.calculateSubmissionScore(submission);
      const needsReview = submission.status === SubmissionStatus.NEEDS_REVIEW;

      return {
        date: (submission.reviewedAt ?? submission.createdAt).toISOString(),
        score: score.calculatedScore,
        maxScore: score.maxScore,
        examId: submission.exam.id,
        examTitle: submission.exam.title,
        submissionId: submission.id,
        status: submission.status,
        needsReview,
        reviewNote: needsReview ? 'Pending manual review' : null,
      };
    });
  }

  async manualOverride(id: string, dto: UpdateSubmissionOverrideDto) {
    const submission = await this.submissionsRepository.findOneWithDetails(id);

    if (!submission) {
      throw new NotFoundException('Submission not found');
    }

    await this.prisma.$transaction(async (tx) => {
      const updateData: Prisma.SubmissionUncheckedUpdateInput = {};

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
      }
      if (dto.resolvedVariantId) {
        updateData.resolvedVariantId = dto.resolvedVariantId;
      }

      if (dto.resolvedTestCode || dto.resolvedVariantId) {
        updateData.testCodeResolutionStatus = TestCodeResolutionStatus.MATCHED;
      }

      updateData.status = SubmissionStatus.GRADED;
      updateData.reviewedAt = new Date();

      await tx.submission.update({
        where: { id },
        data: updateData,
      });

      if (dto.details && dto.details.length > 0) {
        for (const detail of dto.details) {
          await tx.submissionDetail.update({
            where: {
              submissionId_questionNumber: {
                submissionId: id,
                questionNumber: detail.questionNumber,
              },
            },
            data: {
              finalAnswer: detail.finalAnswer,
            },
          });
        }
      }
    });

    return this.submissionsRepository.findOneWithDetails(id);
  }

  @OnEvent('remark.approved')
  async handleRemarkApprovedEvent(payload: RemarkApprovedEvent) {
    const detail = await this.prisma.submissionDetail.findUnique({
      where: { id: payload.submissionDetailId },
    });

    if (detail) {
      await this.submissionsRepository.updateSubmissionDetail(
        detail.submissionId,
        detail.questionNumber,
        { finalAnswer: payload.finalAnswer },
      );
      this.eventEmitter.emit('submission.detail.updated', {
        submissionId: detail.submissionId,
        questionNumber: detail.questionNumber,
        finalAnswer: payload.finalAnswer,
        source: 'remark.approved',
      });
    }
  }

  private assertStudentRequest(requestUser: { id: string; role: string }) {
    if (requestUser.role !== Role.STUDENT) {
      throw new ForbiddenException(
        'This endpoint is only available for students',
      );
    }
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

  async submitClassExam(
    examId: string,
    studentId: string,
    payload: {
      answers: Array<{
        questionId: string;
        selectedChoice?: AnswerChoice;
        essayAnswer?: string;
      }>;
    },
  ) {
    const exam = await this.submissionsRepository.findClassExamForSubmission(
      examId,
      studentId,
    );
    if (!exam) {
      throw new NotFoundException('Class exam not found');
    }

    const questionMap = new Map(
      exam.classQuestions.map((item) => [item.id, item]),
    );
    let autoScore = 0;
    let manualRequired = false;
    const normalizedAnswers = payload.answers.map((answer) => {
      const question = questionMap.get(answer.questionId);
      if (!question) {
        throw new BadRequestException(
          `Question ${answer.questionId} does not belong to this exam`,
        );
      }

      if (
        question.type === QuestionType.MULTIPLE_CHOICE &&
        question.answerChoice
      ) {
        const isCorrect = answer.selectedChoice === question.answerChoice;
        const questionAutoScore = isCorrect ? question.maxScore : 0;
        autoScore += questionAutoScore;
        return { ...answer, autoScore: questionAutoScore };
      }

      manualRequired = true;
      return { ...answer, autoScore: undefined };
    });

    const status = manualRequired
      ? ClassExamSubmissionStatus.PENDING_MANUAL_GRADE
      : ClassExamSubmissionStatus.GRADED;
    const totalScore = manualRequired ? undefined : autoScore;

    return this.submissionsRepository.upsertClassExamSubmission({
      examId,
      studentId,
      answers: normalizedAnswers,
      autoScore,
      manualScore: 0,
      totalScore,
      status,
      gradedAt: manualRequired ? undefined : new Date(),
    });
  }

  async gradeClassExamSubmission(
    submissionId: string,
    teacherId: string,
    payload: { manualScores: Array<{ answerId: string; manualScore: number }> },
  ) {
    const submission =
      await this.submissionsRepository.findClassExamSubmissionForTeacher(
        submissionId,
        teacherId,
      );
    if (!submission) {
      throw new NotFoundException('Class exam submission not found');
    }

    const answerMap = new Map(
      submission.answers.map((answer) => [answer.id, answer]),
    );
    let manualScore = 0;

    for (const item of payload.manualScores) {
      const answer = answerMap.get(item.answerId);
      if (!answer) {
        throw new BadRequestException(
          `Answer ${item.answerId} does not belong to submission`,
        );
      }
      if (item.manualScore < 0 || item.manualScore > answer.question.maxScore) {
        throw new BadRequestException(
          `manualScore for answer ${item.answerId} is out of range`,
        );
      }
      manualScore += item.manualScore;
    }

    return this.submissionsRepository.gradeClassExamSubmission(submissionId, {
      manualScores: payload.manualScores,
      manualScore,
      totalScore: submission.autoScore + manualScore,
    });
  }
}
