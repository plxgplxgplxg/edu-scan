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

      if (data.classIds.length > 0) {
        await tx.examClass.createMany({
          data: data.classIds.map((classId) => ({
            examId,
            classId,
          })),
        });
      }

      // Lấy các variants hiện có
      const existingVariants = await tx.examVariant.findMany({
        where: { examId },
      });
      const existingVariantsMap = new Map(existingVariants.map(v => [v.testCode, v.id]));
      const payloadTestCodes = new Set(data.variants.map(v => v.testCode));

      // Xoá các variants không còn trong payload
      const variantsToDelete = existingVariants.filter(v => !payloadTestCodes.has(v.testCode));
      if (variantsToDelete.length > 0) {
        await tx.examVariant.deleteMany({
          where: {
            id: {
              in: variantsToDelete.map(v => v.id)
            }
          }
        });
      }

      // Xoá toàn bộ answerKeys của các variants thuộc exam để nạp lại
      await tx.answerKey.deleteMany({
        where: {
          variant: {
            examId,
          },
        },
      });

      // Đồng bộ variants và answerKeys
      for (const variant of data.variants) {
        let variantId = existingVariantsMap.get(variant.testCode);
        
        if (!variantId) {
          const created = await tx.examVariant.create({
            data: {
              examId,
              testCode: variant.testCode,
            },
          });
          variantId = created.id;
        }

        await tx.answerKey.createMany({
          data: variant.answerKeys.map((item) => ({
            variantId,
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
    const variantTestCodeMap = new Map<string, string>();
    for (const variant of exam.variants) {
      const keysMap = new Map<number, AnswerChoice>();
      for (const key of variant.answerKeys) {
        keysMap.set(key.questionNumber, key.correctAnswer);
      }
      variantAnswerKeysMap.set(variant.id, keysMap);
      variantTestCodeMap.set(variant.testCode, variant.id);
    }

    const submissions = await this.prismaService.submission.findMany({
      where: { examId },
      include: {
        details: true,
      },
    });

    for (const sub of submissions) {
      let variantId = sub.resolvedVariantId;

      // Tự động khôi phục resolvedVariantId nếu bị null hoặc không tìm thấy trong DB hiện tại
      if (!variantId || !variantAnswerKeysMap.has(variantId)) {
        const lookupCode = (sub.resolvedTestCode || sub.detectedTestId || 'DEFAULT').trim().toUpperCase();
        let matchedVariantId = variantTestCodeMap.get(lookupCode);

        if (!matchedVariantId && exam.variants.length === 1) {
          matchedVariantId = exam.variants[0].id;
        }

        if (matchedVariantId) {
          variantId = matchedVariantId;
          await this.prismaService.submission.update({
            where: { id: sub.id },
            data: { resolvedVariantId: matchedVariantId },
          });
        }
      }

      const answerKeysMap = variantId ? variantAnswerKeysMap.get(variantId) : null;

      let correctCount = 0;
      let wrongCount = 0;
      let reviewCount = 0;

      const detailUpdates: any[] = [];

      for (const detail of sub.details) {
        const finalAnswer = detail.finalAnswer;
        const correctAnswer = answerKeysMap ? (answerKeysMap.get(detail.questionNumber) ?? null) : null;
        
        // So sánh không phân biệt hoa thường và khoảng trắng để tránh lỗi lệch kiểu
        const isCorrect = finalAnswer !== null && correctAnswer !== null && 
          String(finalAnswer).trim().toUpperCase() === String(correctAnswer).trim().toUpperCase();

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
          this.prismaService.submissionDetail.update({
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

      await this.prismaService.submission.update({
        where: { id: sub.id },
        data: {
          correctCount,
          wrongCount,
          reviewCount,
          score,
          status: subNeedsReview ? 'NEEDS_REVIEW' : 'GRADED',
        },
      });
    }
  }
}
