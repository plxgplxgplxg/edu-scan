import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class SubmissionsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(filter: Prisma.SubmissionWhereInput) {
    return this.prisma.submission.findMany({
      where: filter,
      include: {
        student: {
          select: { id: true, name: true, studentCode: true },
        },
        batch: {
          select: { id: true, status: true },
        },
        exam: {
          select: { id: true, title: true, maxScore: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOneWithDetails(id: string) {
    return this.prisma.submission.findUnique({
      where: { id },
      include: {
        details: true,
        resolvedVariant: {
          include: {
            answerKeys: true,
          },
        },
        student: {
          select: { id: true, name: true, studentCode: true },
        },
        exam: {
          select: { id: true, title: true, maxScore: true },
        },
      },
    });
  }

  async update(id: string, data: Prisma.SubmissionUncheckedUpdateInput) {
    return this.prisma.submission.update({
      where: { id },
      data,
    });
  }

  async updateSubmissionDetail(
    submissionId: string,
    questionNumber: number,
    data: Prisma.SubmissionDetailUpdateInput,
  ) {
    return this.prisma.submissionDetail.update({
      where: {
        submissionId_questionNumber: {
          submissionId,
          questionNumber,
        },
      },
      data,
    });
  }

  async findStudentSubmissionsPaginated(params: {
    studentId: string;
    examId?: string;
    classId?: string;
    status?: Prisma.SubmissionWhereInput['status'];
    page: number;
    limit: number;
  }) {
    const where = this.buildStudentWhereInput(params);

    return this.prisma.submission.findMany({
      where,
      include: {
        exam: {
          select: { id: true, title: true, maxScore: true },
        },
        resolvedVariant: {
          include: {
            answerKeys: true,
          },
        },
        details: {
          select: {
            questionNumber: true,
            finalAnswer: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip: (params.page - 1) * params.limit,
      take: params.limit,
    });
  }

  async countStudentSubmissions(params: {
    studentId: string;
    examId?: string;
    classId?: string;
    status?: Prisma.SubmissionWhereInput['status'];
  }) {
    const where = this.buildStudentWhereInput(params);
    return this.prisma.submission.count({ where });
  }

  async findStudentSubmissionsForProgress(studentId: string) {
    return this.prisma.submission.findMany({
      where: { studentId },
      include: {
        exam: {
          select: { id: true, title: true, maxScore: true },
        },
        resolvedVariant: {
          include: {
            answerKeys: true,
          },
        },
        details: {
          select: {
            questionNumber: true,
            finalAnswer: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  private buildStudentWhereInput(params: {
    studentId: string;
    examId?: string;
    classId?: string;
    status?: Prisma.SubmissionWhereInput['status'];
  }): Prisma.SubmissionWhereInput {
    const where: Prisma.SubmissionWhereInput = {
      studentId: params.studentId,
    };

    if (params.examId) {
      where.examId = params.examId;
    }

    if (params.status) {
      where.status = params.status;
    }

    if (params.classId) {
      where.exam = {
        classes: {
          some: {
            classId: params.classId,
          },
        },
      };
    }

    return where;
  }
}
