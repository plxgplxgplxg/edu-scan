import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { Prisma, GradeStatus, SubmitStatus } from '@prisma/client';

export type CreateAssignmentRecord = {
  title: string;
  description?: string;
  deadline: Date;
  allowLate: boolean;
  latePenaltyPct: number;
  maxScore: number;
  teacherId: string;
  classId: string;
  attachments?: any;
};

@Injectable()
export class AssignmentsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateAssignmentRecord) {
    return this.prisma.assignment.create({
      data: {
        title: data.title,
        description: data.description,
        deadline: data.deadline,
        allowLate: data.allowLate,
        latePenaltyPct: data.latePenaltyPct,
        maxScore: data.maxScore,
        attachments: data.attachments ? (data.attachments as Prisma.InputJsonValue) : Prisma.JsonNull,
        teacher: { connect: { id: data.teacherId } },
        class: { connect: { id: data.classId } },
      },
      include: {
        class: { select: { id: true, name: true } },
      },
    });
  }

  async findAllByTeacher(teacherId: string) {
    return this.prisma.assignment.findMany({
      where: { teacherId },
      include: {
        class: { select: { id: true, name: true } },
        _count: { select: { submits: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findAllByStudent(studentId: string) {
    return this.prisma.assignment.findMany({
      where: {
        class: {
          enrollments: {
            some: { studentId },
          },
        },
      },
      include: {
        class: { select: { id: true, name: true } },
        submits: {
          where: { studentId },
          select: {
            id: true,
            submitStatus: true,
            gradeStatus: true,
            score: true,
            note: true,
            attachments: true,
            submittedAt: true,
          },
        },
      },
      orderBy: { deadline: 'asc' },
    });
  }

  async findById(id: string) {
    return this.prisma.assignment.findUnique({
      where: { id },
      include: {
        class: { select: { id: true, name: true } },
      },
    });
  }

  async findSubmitsByAssignment(assignmentId: string, page = 1, limit = 10) {
    const skip = (page - 1) * limit;
    
    const [data, total] = await this.prisma.$transaction([
      this.prisma.assignmentSubmit.findMany({
        where: { assignmentId },
        include: {
          student: {
            select: { id: true, name: true, email: true, studentCode: true },
          },
        },
        orderBy: { submittedAt: 'asc' },
        skip,
        take: limit,
      }),
      this.prisma.assignmentSubmit.count({ where: { assignmentId } })
    ]);

    return {
      items: data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findSubmitByStudentAndAssignment(
    assignmentId: string,
    studentId: string,
  ) {
    return this.prisma.assignmentSubmit.findUnique({
      where: { assignmentId_studentId: { assignmentId, studentId } },
    });
  }

  async createSubmit(data: {
    assignmentId: string;
    studentId: string;
    note?: string | null;
    attachments?: any;
    submitStatus: SubmitStatus;
    gradeStatus: GradeStatus;
  }) {
    return this.prisma.assignmentSubmit.create({ data });
  }

  async updateSubmit(
    submitId: string,
    assignmentId: string,
    data: Prisma.AssignmentSubmitUpdateInput,
  ) {
    return this.prisma.assignmentSubmit.update({
      where: { id: submitId },
      data,
    });
  }

  async delete(id: string) {
    return this.prisma.assignment.delete({
      where: { id },
    });
  }
}
