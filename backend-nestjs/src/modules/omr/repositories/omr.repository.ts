import { Injectable } from '@nestjs/common';
import {
  OmrBatchStatus,
  Prisma,
  Role,
  SubmissionStatus,
  TestCodeResolutionStatus,
  User,
} from '@prisma/client';
import { PrismaService } from '../../../database/prisma.service';

const variantInclude = {
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
} as const;

export const omrBatchDetailInclude = {
  exam: {
    include: {
      variants: variantInclude,
    },
  },
  submissions: {
    include: {
      student: {
        select: {
          id: true,
          name: true,
          studentCode: true,
        },
      },
      resolvedVariant: {
        include: {
          answerKeys: {
            orderBy: {
              questionNumber: 'asc',
            },
          },
        },
      },
      details: {
        orderBy: {
          questionNumber: 'asc',
        },
      },
    },
    orderBy: {
      createdAt: 'asc',
    },
  },
} satisfies Prisma.OmrBatchInclude;

export const omrBatchListInclude = {
  exam: {
    select: {
      id: true,
      title: true,
    },
  },
  submissions: {
    select: {
      id: true,
      studentId: true,
    },
  },
} satisfies Prisma.OmrBatchInclude;

export type OmrBatchWithRelations = Prisma.OmrBatchGetPayload<{
  include: typeof omrBatchDetailInclude;
}>;

export type OmrBatchLightweight = Prisma.OmrBatchGetPayload<{
  include: typeof omrBatchListInclude;
}>;

export const omrExamInclude = {
  variants: variantInclude,
  classes: {
    include: {
      class: {
        select: {
          id: true,
          name: true,
          enrollments: {
            select: {
              studentId: true,
            },
          },
        },
      },
    },
  },
} satisfies Prisma.ExamInclude;

export type OmrExam = Prisma.ExamGetPayload<{
  include: typeof omrExamInclude;
}>;

export type OmrSubmissionWithRelations = Prisma.SubmissionGetPayload<{
  include: {
    exam: {
      include: {
        variants: typeof variantInclude;
      };
    };
    resolvedVariant: {
      include: {
        answerKeys: {
          orderBy: {
            questionNumber: 'asc';
          };
        };
      };
    };
    student: {
      select: {
        id: true;
        name: true;
        studentCode: true;
      };
    };
    details: {
      orderBy: {
        questionNumber: 'asc';
      };
    };
  };
}>;

type SubmissionDetailInput = {
  questionNumber: number;
  detectedAnswer: string | null;
  finalAnswer: Prisma.SubmissionDetailCreateManySubmissionInput['finalAnswer'];
  needsReview: boolean;
  reviewReason: string | null;
  correctAnswer: Prisma.SubmissionDetailCreateManySubmissionInput['correctAnswer'];
  isCorrect: boolean;
};

export const resolveFinalBatchStatus = (
  successCount: number,
  failedCount: number,
) => {
  if (failedCount === 0) {
    return OmrBatchStatus.COMPLETED;
  }

  if (successCount === 0) {
    return OmrBatchStatus.FAILED;
  }

  return OmrBatchStatus.PARTIAL_FAILED;
};

@Injectable()
export class OmrRepository {
  constructor(private readonly prismaService: PrismaService) {}

  async findExamById(examId: string) {
    return this.prismaService.exam.findUnique({
      where: { id: examId },
      include: omrExamInclude,
    });
  }

  async createBatch(data: {
    examId: string;
    teacherId: string;
    totalFiles: number;
  }) {
    return this.prismaService.omrBatch.create({
      data: {
        examId: data.examId,
        teacherId: data.teacherId,
        totalFiles: data.totalFiles,
      },
      include: omrBatchDetailInclude,
    });
  }

  async listTeacherBatches(teacherId: string): Promise<OmrBatchLightweight[]> {
    return this.prismaService.omrBatch.findMany({
      where: {
        teacherId,
      },
      include: omrBatchListInclude,
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async markBatchStatus(batchId: string, status: OmrBatchStatus) {
    return this.prismaService.omrBatch.update({
      where: { id: batchId },
      data: { status },
    });
  }

  async findTeacherBatchById(batchId: string, teacherId: string) {
    return this.prismaService.omrBatch.findFirst({
      where: {
        id: batchId,
        teacherId,
      },
      include: omrBatchDetailInclude,
    });
  }

  async findBatchById(batchId: string) {
    return this.prismaService.omrBatch.findUnique({
      where: { id: batchId },
      include: {
        exam: {
          include: {
            variants: variantInclude,
          },
        },
      },
    });
  }

  async findTeacherSubmissionById(submissionId: string, teacherId: string) {
    return this.prismaService.submission.findFirst({
      where: {
        id: submissionId,
        exam: {
          teacherId,
        },
      },
      include: {
        exam: {
          include: {
            variants: variantInclude,
          },
        },
        resolvedVariant: {
          include: {
            answerKeys: {
              orderBy: {
                questionNumber: 'asc',
              },
            },
          },
        },
        student: {
          select: {
            id: true,
            name: true,
            studentCode: true,
          },
        },
        details: {
          orderBy: {
            questionNumber: 'asc',
          },
        },
      },
    });
  }

  async findStudentByStudentCode(
    studentCode: string,
  ): Promise<Pick<User, 'id' | 'name' | 'studentCode'> | null> {
    return this.prismaService.user.findFirst({
      where: {
        role: Role.STUDENT,
        isActive: true,
        studentCode,
      },
      select: {
        id: true,
        name: true,
        studentCode: true,
      },
    });
  }

  async recordSuccessfulFile(data: {
    batchId: string;
    examId: string;
    resolvedVariantId: string | null;
    imageUrl: string;
    studentId: string | null;
    studentCode: string | null;
    studentCodeRaw: string | null;
    matchedStudentId: string | null;
    isExternal: boolean;
    detectedTestId: string | null;
    resolvedTestCode: string | null;
    testCodeResolutionStatus: TestCodeResolutionStatus;
    status: SubmissionStatus;
    score: number;
    maxScore: number;
    correctCount: number;
    wrongCount: number;
    reviewCount: number;
    gradedAt: Date;
    details: SubmissionDetailInput[];
    processedImageUrl?: string | null;
    annotatedImageUrl?: string | null;
    warpOverlayUrl?: string | null;
    answerScoresUrl?: string | null;
  }) {
    return this.prismaService.$transaction(async (tx) => {
      await tx.submission.create({
        data: {
          examId: data.examId,
          batchId: data.batchId,
          resolvedVariantId: data.resolvedVariantId,
          studentId: data.studentId,
          studentCode: data.studentCode,
          studentCodeRaw: data.studentCodeRaw,
          matchedStudentId: data.matchedStudentId,
          isExternal: data.isExternal,
          detectedTestId: data.detectedTestId,
          resolvedTestCode: data.resolvedTestCode,
          testCodeResolutionStatus: data.testCodeResolutionStatus,
          imageUrl: data.imageUrl,
          processedImageUrl: data.processedImageUrl,
          annotatedImageUrl: data.annotatedImageUrl,
          warpOverlayUrl: data.warpOverlayUrl,
          answerScoresUrl: data.answerScoresUrl,
          status: data.status,
          score: data.score,
          maxScore: data.maxScore,
          correctCount: data.correctCount,
          wrongCount: data.wrongCount,
          reviewCount: data.reviewCount,
          gradedAt: data.gradedAt,
          details: {
            createMany: {
              data: data.details,
            },
          },
        },
      });

      const batch = await tx.omrBatch.update({
        where: { id: data.batchId },
        data: {
          processedFiles: {
            increment: 1,
          },
          successCount: {
            increment: 1,
          },
        },
      });

      return this.finalizeBatchIfNeeded(tx, batch);
    });
  }

  async recordFailedFile(batchId: string) {
    return this.prismaService.$transaction(async (tx) => {
      const batch = await tx.omrBatch.update({
        where: { id: batchId },
        data: {
          processedFiles: {
            increment: 1,
          },
          failedCount: {
            increment: 1,
          },
        },
      });

      return this.finalizeBatchIfNeeded(tx, batch);
    });
  }

  private async finalizeBatchIfNeeded(
    tx: Prisma.TransactionClient,
    batch: {
      id: string;
      totalFiles: number;
      processedFiles: number;
      successCount: number;
      failedCount: number;
    },
  ) {
    if (batch.processedFiles < batch.totalFiles) {
      return tx.omrBatch.update({
        where: { id: batch.id },
        data: {
          status: OmrBatchStatus.PROCESSING,
        },
      });
    }

    const status = resolveFinalBatchStatus(
      batch.successCount,
      batch.failedCount,
    );

    return tx.omrBatch.update({
      where: { id: batch.id },
      data: {
        status,
        completedAt: new Date(),
      },
    });
  }

  async updateSubmissionScores(data: {
    submissionId: string;
    score: number;
    maxScore: number;
    correctCount: number;
    wrongCount: number;
    reviewCount: number;
    gradedAt: Date;
    status: SubmissionStatus;
    details: Array<{
      id: string;
      correctAnswer: Prisma.SubmissionDetailUpdateInput['correctAnswer'];
      isCorrect: boolean;
    }>;
  }) {
    return this.prismaService.$transaction(async (tx) => {
      await tx.submission.update({
        where: { id: data.submissionId },
        data: {
          score: data.score,
          maxScore: data.maxScore,
          correctCount: data.correctCount,
          wrongCount: data.wrongCount,
          reviewCount: data.reviewCount,
          gradedAt: data.gradedAt,
          status: data.status,
        },
      });

      for (const detail of data.details) {
        await tx.submissionDetail.update({
          where: { id: detail.id },
          data: {
            correctAnswer: detail.correctAnswer,
            isCorrect: detail.isCorrect,
          },
        });
      }
    });
  }
}
