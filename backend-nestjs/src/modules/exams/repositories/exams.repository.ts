import { Injectable } from '@nestjs/common';
import { AnswerChoice, Prisma } from '@prisma/client';
import { PrismaService } from '../../../database/prisma.service';

export const examDetailInclude = {
  teacher: {
    select: {
      id: true,
      name: true,
      email: true,
    },
  },
  classes: {
    include: {
      class: {
        select: {
          id: true,
          name: true,
          subject: true,
          schoolYear: true,
          code: true,
        },
      },
    },
  },
  answerKeys: {
    orderBy: {
      questionNumber: 'asc',
    },
  },
  questionMap: {
    include: {
      question: {
        select: {
          id: true,
          content: true,
          subject: true,
          difficulty: true,
        },
      },
    },
    orderBy: {
      questionNumber: 'asc',
    },
  },
} satisfies Prisma.ExamInclude;

export type ExamWithRelations = Prisma.ExamGetPayload<{
  include: typeof examDetailInclude;
}>;

@Injectable()
export class ExamsRepository {
  constructor(private readonly prismaService: PrismaService) {}

  async createExam(data: {
    title: string;
    maxScore: number;
    teacherId: string;
    classIds: string[];
    answerKeys: Array<{
      questionNumber: number;
      correctAnswer: AnswerChoice;
    }>;
    questionMap: Array<{
      questionNumber: number;
      questionId?: string;
    }>;
  }) {
    return this.prismaService.$transaction(async (tx) => {
      const exam = await tx.exam.create({
        data: {
          title: data.title,
          maxScore: data.maxScore,
          teacherId: data.teacherId,
        },
      });

      await tx.examClass.createMany({
        data: data.classIds.map((classId) => ({
          examId: exam.id,
          classId,
        })),
      });

      await tx.answerKey.createMany({
        data: data.answerKeys.map((item) => ({
          examId: exam.id,
          questionNumber: item.questionNumber,
          correctAnswer: item.correctAnswer,
        })),
      });

      if (data.questionMap.length > 0) {
        await tx.examQuestion.createMany({
          data: data.questionMap.map((item) => ({
            examId: exam.id,
            questionNumber: item.questionNumber,
            questionId: item.questionId ?? null,
          })),
        });
      }

      return tx.exam.findUniqueOrThrow({
        where: { id: exam.id },
        include: examDetailInclude,
      });
    });
  }

  async listTeacherExams(teacherId: string): Promise<ExamWithRelations[]> {
    return this.prismaService.exam.findMany({
      where: { teacherId },
      include: examDetailInclude,
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findTeacherExamById(
    examId: string,
    teacherId: string,
  ): Promise<ExamWithRelations | null> {
    return this.prismaService.exam.findFirst({
      where: {
        id: examId,
        teacherId,
      },
      include: examDetailInclude,
    });
  }

  async findTeacherClassesByIds(teacherId: string, classIds: string[]) {
    return this.prismaService.class.findMany({
      where: {
        teacherId,
        id: {
          in: classIds,
        },
      },
      select: {
        id: true,
      },
    });
  }

  async findTeacherQuestionsByIds(teacherId: string, questionIds: string[]) {
    return this.prismaService.question.findMany({
      where: {
        teacherId,
        id: {
          in: questionIds,
        },
      },
      select: {
        id: true,
      },
    });
  }

  async countExamDependencies(examId: string) {
    const [submissionCount, batchCount] = await this.prismaService.$transaction([
      this.prismaService.submission.count({
        where: { examId },
      }),
      this.prismaService.omrBatch.count({
        where: { examId },
      }),
    ]);

    return {
      submissionCount,
      batchCount,
    };
  }

  async updateExam(
    examId: string,
    data: {
      title?: string;
      maxScore?: number;
      classIds: string[];
      answerKeys: Array<{
        questionNumber: number;
        correctAnswer: AnswerChoice;
      }>;
      questionMap: Array<{
        questionNumber: number;
        questionId?: string;
      }>;
    },
  ): Promise<ExamWithRelations> {
    return this.prismaService.$transaction(async (tx) => {
      await tx.exam.update({
        where: { id: examId },
        data: {
          title: data.title,
          maxScore: data.maxScore,
        },
      });

      await tx.examClass.deleteMany({
        where: { examId },
      });

      await tx.answerKey.deleteMany({
        where: { examId },
      });

      await tx.examQuestion.deleteMany({
        where: { examId },
      });

      await tx.examClass.createMany({
        data: data.classIds.map((classId) => ({
          examId,
          classId,
        })),
      });

      await tx.answerKey.createMany({
        data: data.answerKeys.map((item) => ({
          examId,
          questionNumber: item.questionNumber,
          correctAnswer: item.correctAnswer,
        })),
      });

      if (data.questionMap.length > 0) {
        await tx.examQuestion.createMany({
          data: data.questionMap.map((item) => ({
            examId,
            questionNumber: item.questionNumber,
            questionId: item.questionId ?? null,
          })),
        });
      }

      return tx.exam.findUniqueOrThrow({
        where: { id: examId },
        include: examDetailInclude,
      });
    });
  }

  async deleteExam(examId: string) {
    return this.prismaService.exam.delete({
      where: { id: examId },
    });
  }
}
