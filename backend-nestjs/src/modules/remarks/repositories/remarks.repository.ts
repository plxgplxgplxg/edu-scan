import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { CreateRemarkRequestDto } from '../dtos/create-remark.dto';
import { Prisma, RemarkStatus } from '@prisma/client';

@Injectable()
export class RemarksRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findSubmissionDetail(submissionDetailId: string, studentId: string) {
    return this.prisma.submissionDetail.findFirst({
      where: {
        id: submissionDetailId,
        submission: {
          studentId: studentId,
        },
      },
    });
  }

  async findPendingRemarkForDetail(
    submissionDetailId: string,
    studentId: string,
  ) {
    return this.prisma.remarkRequest.findFirst({
      where: {
        submissionDetailId,
        studentId,
        status: RemarkStatus.PENDING,
      },
    });
  }

  async createRemark(studentId: string, dto: CreateRemarkRequestDto) {
    return this.prisma.remarkRequest.create({
      data: {
        studentId,
        submissionDetailId: dto.submissionDetailId,
        reason: dto.reason,
        status: RemarkStatus.PENDING,
      },
    });
  }

  async findAllRemarks(status?: RemarkStatus) {
    const whereCondition = status ? { status } : {};
    return this.prisma.remarkRequest.findMany({
      where: whereCondition,
      include: {
        submissionDetail: {
          include: {
            submission: {
              include: {
                exam: { select: { title: true } },
                student: { select: { name: true, studentCode: true } },
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async findStudentRemarks(studentId: string) {
    return this.prisma.remarkRequest.findMany({
      where: {
        studentId,
      },
      include: {
        submissionDetail: {
          include: {
            submission: {
              include: {
                exam: { select: { title: true } },
                student: { select: { name: true, studentCode: true } },
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findRemarkById(id: string) {
    return this.prisma.remarkRequest.findUnique({
      where: { id },
    });
  }

  async updateRemark(id: string, data: Prisma.RemarkRequestUpdateInput) {
    return this.prisma.remarkRequest.update({
      where: { id },
      data,
    });
  }
}
