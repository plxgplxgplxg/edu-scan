import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { Prisma, GradeStatus, SubmitStatus } from '@prisma/client';

@Injectable()
export class AssignmentsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    data: Omit<Prisma.AssignmentCreateInput, 'classes'> & {
      teacherId: string;
    },
    classIds: string[],
  ) {
    return this.prisma.assignment.create({
      data: {
        title: (data as any).title,
        description: (data as any).description,
        deadline: (data as any).deadline,
        allowLate: (data as any).allowLate ?? false,
        latePenaltyPct: (data as any).latePenaltyPct ?? 0,
        maxScore: (data as any).maxScore ?? 10,
        teacher: { connect: { id: (data as any).teacherId } },
        classes: {
          create: classIds.map((classId) => ({
            class: { connect: { id: classId } },
          })),
        },
      },
      include: {
        classes: { select: { classId: true } },
      },
    });
  }

  async findAllByTeacher(teacherId: string) {
    return this.prisma.assignment.findMany({
      where: { teacherId },
      include: {
        classes: { select: { classId: true } },
        _count: { select: { submits: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findAllByStudent(studentId: string) {
    return this.prisma.assignment.findMany({
      where: {
        classes: {
          some: {
            class: {
              enrollments: { some: { studentId } },
            },
          },
        },
      },
      include: {
        classes: { select: { classId: true } },
        submits: {
          where: { studentId },
          select: {
            id: true,
            submitStatus: true,
            gradeStatus: true,
            score: true,
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
        classes: { select: { classId: true } },
      },
    });
  }

  async findSubmitsByAssignment(assignmentId: string) {
    return this.prisma.assignmentSubmit.findMany({
      where: { assignmentId },
      include: {
        student: {
          select: { id: true, name: true, email: true, studentCode: true },
        },
      },
      orderBy: { submittedAt: 'asc' },
    });
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
    fileUrl: string;
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
}
