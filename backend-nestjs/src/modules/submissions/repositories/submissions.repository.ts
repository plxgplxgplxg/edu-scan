import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { Prisma } from '@prisma/client';
import { GetSubmissionsQueryDto } from '../dtos/get-submissions-query.dto';

@Injectable()
export class SubmissionsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: GetSubmissionsQueryDto) {
    const {
      page = 1,
      limit = 10,
      keyword,
      sortScore,
      variantCode,
      examId,
      classId,
      batchId,
      studentId,
      status,
      testCodeResolutionStatus,
    } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.SubmissionWhereInput = {
      ...(examId && { examId }),
      ...(classId && { classId }),
      ...(batchId && { batchId }),
      ...(studentId && { studentId }),
      ...(status && { status }),
      ...(testCodeResolutionStatus && { testCodeResolutionStatus }),
      ...(variantCode && { resolvedTestCode: variantCode }),
    };

    if (keyword) {
      where.OR = [
        { student: { name: { contains: keyword, mode: 'insensitive' } } },
        { studentCode: { contains: keyword, mode: 'insensitive' } },
      ];
    }

    const orderBy: Prisma.SubmissionOrderByWithRelationInput[] = [];
    if (sortScore) {
      orderBy.push({ score: sortScore });
    } else {
      orderBy.push({ createdAt: 'desc' });
    }

    const [data, total] = await this.prisma.$transaction([
      this.prisma.submission.findMany({
        where,
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
          resolvedVariant: {
            select: { id: true, testCode: true },
          },
        },
        orderBy,
        skip,
        take: limit,
      }),
      this.prisma.submission.count({ where }),
    ]);

    return {
      items: data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
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
}
