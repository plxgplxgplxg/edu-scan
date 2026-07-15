import { Injectable } from '@nestjs/common';
import { AnswerChoice, ExamStatus, Prisma } from '@prisma/client';
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
  _count: {
    select: {
      submissions: true,
    },
  },
} satisfies Prisma.ExamInclude;

export const examListInclude = {
  classes: {
    select: {
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
    select: {
      id: true,
      testCode: true,
      answerKeys: {
        select: {
          questionNumber: true,
        },
      },
    },
  },
  _count: {
    select: {
      submissions: true,
    },
  },
} satisfies Prisma.ExamInclude;

export type ExamWithRelations = Prisma.ExamGetPayload<{
  include: typeof examDetailInclude;
}>;

export type ExamLightweight = Prisma.ExamGetPayload<{
  include: typeof examListInclude;
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
    questionCount?: number;
    teacherId: string;
    classIds: string[];
    variants: VariantInput[];
  }) {
    return this.prismaService.$transaction(async (tx) => {
      const exam = await tx.exam.create({
        data: {
          title: data.title,
          maxScore: data.maxScore,
          questionCount: data.questionCount ?? 0,
          teacherId: data.teacherId,
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

      return tx.exam.findUniqueOrThrow({
        where: { id: exam.id },
        include: examDetailInclude,
      });
    });
  }

  async listTeacherExams(
    teacherId: string,
    params?: {
      page?: number;
      limit?: number;
      keyword?: string;
    },
  ): Promise<{ data: ExamLightweight[]; total: number }> {
    const { page = 1, limit = 10, keyword } = params || {};
    const skip = (page - 1) * limit;

    const where: Prisma.ExamWhereInput = {
      teacherId,
      ...(keyword ? { title: { contains: keyword, mode: 'insensitive' } } : {}),
    };

    const [data, total] = await this.prismaService.$transaction([
      this.prismaService.exam.findMany({
        where,
        include: examListInclude,
        orderBy: {
          createdAt: 'desc',
        },
        skip,
        take: limit,
      }),
      this.prismaService.exam.count({ where }),
    ]);

    return { data, total };
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
      questionCount?: number;
      classIds: string[];
      variants: VariantInput[];
    },
  ): Promise<ExamWithRelations> {
    return this.prismaService.$transaction(async (tx) => {
      await tx.exam.update({
        where: { id: examId },
        data: {
          title: data.title,
          maxScore: data.maxScore,
          questionCount: data.questionCount,
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

  async regradeSubmissions(examId: string) {
    const exam = await this.prismaService.exam.findUnique({
      where: { id: examId },
      include: {
        variants: {
          include: {
            answerKeys: true,
          },
        },
      },
    });
    if (!exam) return;

    const variantAnswerKeysMap = new Map<string, Map<number, AnswerChoice>>();
    for (const variant of exam.variants) {
      const keysMap = new Map<number, AnswerChoice>();
      for (const key of variant.answerKeys) {
        keysMap.set(key.questionNumber, key.correctAnswer);
      }
      variantAnswerKeysMap.set(variant.id, keysMap);
    }

    const submissions = await this.prismaService.submission.findMany({
      where: { examId },
      include: {
        details: true,
      },
    });

    for (const sub of submissions) {
      const variantId = sub.resolvedVariantId;
      const answerKeysMap = variantId ? variantAnswerKeysMap.get(variantId) : null;

      let correctCount = 0;
      let wrongCount = 0;
      let reviewCount = 0;

      await this.prismaService.$transaction(async (tx) => {
        const detailUpdates: any[] = [];

        for (const detail of sub.details) {
          const finalAnswer = detail.finalAnswer;
          const correctAnswer = answerKeysMap ? (answerKeysMap.get(detail.questionNumber) ?? null) : null;
          const isCorrect = finalAnswer !== null && correctAnswer !== null && finalAnswer === correctAnswer;

          let needsReview = detail.needsReview;
          let reviewReason = detail.reviewReason;

          if (finalAnswer === null) {
            needsReview = true;
            reviewReason = 'MANUAL_BLANK';
          } else {
            if (correctAnswer !== null) {
              needsReview = false;
              reviewReason = null;
            }
          }

          if (needsReview) {
            reviewCount++;
          } else if (isCorrect) {
            correctCount++;
          } else {
            wrongCount++;
          }

          detailUpdates.push(
            tx.submissionDetail.update({
              where: {
                submissionId_questionNumber: {
                  submissionId: sub.id,
                  questionNumber: detail.questionNumber,
                },
              },
              data: {
                correctAnswer,
                isCorrect,
                needsReview,
                reviewReason,
              },
            })
          );
        }

        const totalQuestions = answerKeysMap ? answerKeysMap.size : sub.details.length;
        const score = totalQuestions > 0 && answerKeysMap && answerKeysMap.size > 0
          ? (correctCount / answerKeysMap.size) * exam.maxScore
          : 0;

        const subNeedsReview = sub.details.some(d => d.needsReview) || reviewCount > 0;

        await Promise.all(detailUpdates);

        await tx.submission.update({
          where: { id: sub.id },
          data: {
            correctCount,
            wrongCount,
            reviewCount,
            score,
            status: subNeedsReview ? 'NEEDS_REVIEW' : 'GRADED',
          },
        });
      });
    }
  }
}
