import { Injectable } from '@nestjs/common';
import { AnswerChoice, ExamStatus, ExamType, Prisma, QuestionType } from '@prisma/client';
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
  variants: {
    include: {
      answerKeys: {
        orderBy: {
          questionNumber: 'asc',
        },
      },
    },
    orderBy: {
      testCode: 'asc',
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
  classQuestions: {
    orderBy: {
      orderIndex: 'asc',
    },
  },
} satisfies Prisma.ExamInclude;

export type ExamWithRelations = Prisma.ExamGetPayload<{
  include: typeof examDetailInclude;
}>;

type VariantInput = {
  testCode: string;
  answerKeys: Array<{
    questionNumber: number;
    correctAnswer: AnswerChoice;
  }>;
};

@Injectable()
export class ExamsRepository {
  constructor(private readonly prismaService: PrismaService) {}

  async createExam(data: {
    title: string;
    maxScore: number;
    teacherId: string;
    type?: ExamType;
    classIds: string[];
    variants: VariantInput[];
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
          type: data.type ?? ExamType.OMR,
        },
      });

      if (data.classIds.length > 0) {
        await tx.examClass.createMany({
          data: data.classIds.map((classId) => ({
            examId: exam.id,
            classId,
          })),
        });
      }

      for (const variant of data.variants) {
        const createdVariant = await tx.examVariant.create({
          data: {
            examId: exam.id,
            testCode: variant.testCode,
          },
        });

        await tx.answerKey.createMany({
          data: variant.answerKeys.map((item) => ({
            variantId: createdVariant.id,
            questionNumber: item.questionNumber,
            correctAnswer: item.correctAnswer,
          })),
        });
      }

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

  async listTeacherExamsByType(teacherId: string, type: ExamType): Promise<ExamWithRelations[]> {
    return this.prismaService.exam.findMany({
      where: { teacherId, type },
      include: examDetailInclude,
      orderBy: { createdAt: 'desc' },
    });
  }

  async listStudentPublishedClassExams(studentId: string): Promise<ExamWithRelations[]> {
    return this.prismaService.exam.findMany({
      where: {
        type: ExamType.CLASS_EXAM,
        status: ExamStatus.PUBLISHED,
        classes: {
          some: {
            class: {
              enrollments: {
                some: {
                  studentId,
                },
              },
            },
          },
        },
      },
      include: examDetailInclude,
      orderBy: { createdAt: 'desc' },
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
    const [submissionCount, batchCount] = await this.prismaService.$transaction(
      [
        this.prismaService.submission.count({
          where: { examId },
        }),
        this.prismaService.omrBatch.count({
          where: { examId },
        }),
      ],
    );

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
      variants: VariantInput[];
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
        where: {
          variant: {
            examId,
          },
        },
      });

      await tx.examVariant.deleteMany({
        where: { examId },
      });

      await tx.examQuestion.deleteMany({
        where: { examId },
      });

      if (data.classIds.length > 0) {
        await tx.examClass.createMany({
          data: data.classIds.map((classId) => ({
            examId,
            classId,
          })),
        });
      }

      for (const variant of data.variants) {
        const createdVariant = await tx.examVariant.create({
          data: {
            examId,
            testCode: variant.testCode,
          },
        });

        await tx.answerKey.createMany({
          data: variant.answerKeys.map((item) => ({
            variantId: createdVariant.id,
            questionNumber: item.questionNumber,
            correctAnswer: item.correctAnswer,
          })),
        });
      }

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

  async upsertExamQuestionAnswer(data: {
    examId: string;
    testCode: string;
    questionNumber: number;
    questionId?: string;
    correctAnswer: AnswerChoice;
  }): Promise<ExamWithRelations> {
    return this.prismaService.$transaction(async (tx) => {
      const variant =
        (await tx.examVariant.findFirst({
          where: { examId: data.examId, testCode: data.testCode },
          select: { id: true },
        })) ??
        (await tx.examVariant.create({
          data: {
            examId: data.examId,
            testCode: data.testCode,
          },
          select: { id: true },
        }));

      await tx.answerKey.upsert({
        where: {
          variantId_questionNumber: {
            variantId: variant.id,
            questionNumber: data.questionNumber,
          },
        },
        create: {
          variantId: variant.id,
          questionNumber: data.questionNumber,
          correctAnswer: data.correctAnswer,
        },
        update: {
          correctAnswer: data.correctAnswer,
        },
      });

      await tx.examQuestion.upsert({
        where: {
          examId_questionNumber: {
            examId: data.examId,
            questionNumber: data.questionNumber,
          },
        },
        create: {
          examId: data.examId,
          questionNumber: data.questionNumber,
          questionId: data.questionId ?? null,
        },
        update: {
          questionId: data.questionId ?? null,
        },
      });

      return tx.exam.findUniqueOrThrow({
        where: { id: data.examId },
        include: examDetailInclude,
      });
    });
  }

  async removeExamQuestionAnswer(data: {
    examId: string;
    testCode: string;
    questionNumber: number;
  }): Promise<ExamWithRelations> {
    return this.prismaService.$transaction(async (tx) => {
      const variant = await tx.examVariant.findFirst({
        where: { examId: data.examId, testCode: data.testCode },
        select: { id: true },
      });

      if (variant) {
        await tx.answerKey.deleteMany({
          where: {
            variantId: variant.id,
            questionNumber: data.questionNumber,
          },
        });
      }

      await tx.examQuestion.deleteMany({
        where: {
          examId: data.examId,
          questionNumber: data.questionNumber,
        },
      });

      return tx.exam.findUniqueOrThrow({
        where: { id: data.examId },
        include: examDetailInclude,
      });
    });
  }

  async updateExamStatus(examId: string, status: ExamStatus) {
    return this.prismaService.exam.update({
      where: { id: examId },
      data: { status },
      include: examDetailInclude,
    });
  }

  async upsertClassExamQuestion(data: {
    examId: string;
    orderIndex: number;
    type: QuestionType;
    content: string;
    optionA?: string;
    optionB?: string;
    optionC?: string;
    optionD?: string;
    answerChoice?: AnswerChoice;
    answerText?: string;
    maxScore: number;
  }): Promise<ExamWithRelations> {
    await this.prismaService.classExamQuestion.upsert({
      where: {
        examId_orderIndex: {
          examId: data.examId,
          orderIndex: data.orderIndex,
        },
      },
      create: {
        examId: data.examId,
        orderIndex: data.orderIndex,
        type: data.type,
        content: data.content,
        optionA: data.optionA ?? null,
        optionB: data.optionB ?? null,
        optionC: data.optionC ?? null,
        optionD: data.optionD ?? null,
        answerChoice: data.answerChoice ?? null,
        answerText: data.answerText ?? null,
        maxScore: data.maxScore,
      },
      update: {
        type: data.type,
        content: data.content,
        optionA: data.optionA ?? null,
        optionB: data.optionB ?? null,
        optionC: data.optionC ?? null,
        optionD: data.optionD ?? null,
        answerChoice: data.answerChoice ?? null,
        answerText: data.answerText ?? null,
        maxScore: data.maxScore,
      },
    });

    return this.prismaService.exam.findUniqueOrThrow({
      where: { id: data.examId },
      include: examDetailInclude,
    });
  }

  async removeClassExamQuestion(examId: string, questionId: string): Promise<ExamWithRelations> {
    await this.prismaService.classExamQuestion.deleteMany({
      where: { id: questionId, examId },
    });

    return this.prismaService.exam.findUniqueOrThrow({
      where: { id: examId },
      include: examDetailInclude,
    });
  }
}
