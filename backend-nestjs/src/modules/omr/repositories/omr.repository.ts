import { Injectable } from '@nestjs/common';
import {
  OmrBatchStatus,
  Prisma,
  Role,
  SubmissionStatus,
  User,
} from '@prisma/client';
import { PrismaService } from '../../../database/prisma.service';

export const omrBatchDetailInclude = {
  exam: {
    include: {
      answerKeys: {
        orderBy: {
          questionNumber: 'asc',
        },
      },
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

export type OmrBatchWithRelations = Prisma.OmrBatchGetPayload<{
  include: typeof omrBatchDetailInclude;
}>;

export const omrExamInclude = {
  answerKeys: {
    orderBy: {
      questionNumber: 'asc',
    },
  },
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

type SubmissionDetailInput = {
  questionNumber: number;
  detectedAnswer: string | null;
  finalAnswer: Prisma.SubmissionDetailCreateManySubmissionInput['finalAnswer'];
  needsReview: boolean;
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
            answerKeys: {
              orderBy: {
                questionNumber: 'asc',
              },
            },
          },
        },
      },
    });
  }

  async findEligibleStudentForExam(
    examId: string,
    studentCode: string,
  ): Promise<Pick<User, 'id' | 'name' | 'studentCode'> | null> {
    return this.prismaService.user.findFirst({
      where: {
        role: Role.STUDENT,
        isActive: true,
        studentCode,
        classEnrollments: {
          some: {
            class: {
              examAssignments: {
                some: {
                  examId,
                },
              },
            },
          },
        },
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
    imageUrl: string;
    studentId: string | null;
    studentCode: string | null;
    status: SubmissionStatus;
    details: SubmissionDetailInput[];
  }) {
    return this.prismaService.$transaction(async (tx) => {
      await tx.submission.create({
        data: {
          examId: data.examId,
          batchId: data.batchId,
          studentId: data.studentId,
          studentCode: data.studentCode,
          imageUrl: data.imageUrl,
          status: data.status,
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

    const status = this.resolveFinalBatchStatus(
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

  private resolveFinalBatchStatus(successCount: number, failedCount: number) {
    if (successCount > 0 && failedCount === 0) {
      return OmrBatchStatus.COMPLETED;
    }

    if (successCount > 0 && failedCount > 0) {
      return OmrBatchStatus.PARTIAL_FAILED;
    }

    return OmrBatchStatus.FAILED;
  }
}
