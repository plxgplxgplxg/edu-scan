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

  async update(id: string, data: Prisma.SubmissionUpdateInput) {
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
}
