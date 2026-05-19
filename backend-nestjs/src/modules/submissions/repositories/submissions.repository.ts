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

  async findClassExamForSubmission(examId: string, studentId: string) {
    return this.prisma.exam.findFirst({
      where: {
        id: examId,
        type: 'CLASS_EXAM',
        status: 'PUBLISHED',
        classes: {
          some: {
            class: {
              enrollments: {
                some: {
                  studentId,
                },
              },
            },
          },
        },
      },
      include: {
        classQuestions: {
          orderBy: { orderIndex: 'asc' },
        },
      },
    });
  }

  async upsertClassExamSubmission(data: {
    examId: string;
    studentId: string;
    answers: Array<{
      questionId: string;
      selectedChoice?: 'A' | 'B' | 'C' | 'D';
      essayAnswer?: string;
      autoScore?: number;
    }>;
    autoScore: number;
    manualScore: number;
    totalScore?: number;
    status: 'PENDING_MANUAL_GRADE' | 'GRADED';
    gradedAt?: Date;
  }) {
    return this.prisma.$transaction(async (tx) => {
      const submission = await tx.classExamSubmission.upsert({
        where: {
          examId_studentId: {
            examId: data.examId,
            studentId: data.studentId,
          },
        },
        create: {
          examId: data.examId,
          studentId: data.studentId,
          autoScore: data.autoScore,
          manualScore: data.manualScore,
          totalScore: data.totalScore ?? null,
          status: data.status,
          gradedAt: data.gradedAt ?? null,
        },
        update: {
          autoScore: data.autoScore,
          manualScore: data.manualScore,
          totalScore: data.totalScore ?? null,
          status: data.status,
          gradedAt: data.gradedAt ?? null,
          submittedAt: new Date(),
        },
      });

      await tx.classExamSubmissionAnswer.deleteMany({
        where: { submissionId: submission.id },
      });

      if (data.answers.length > 0) {
        await tx.classExamSubmissionAnswer.createMany({
          data: data.answers.map((item) => ({
            submissionId: submission.id,
            questionId: item.questionId,
            selectedChoice: item.selectedChoice ?? null,
            essayAnswer: item.essayAnswer ?? null,
            autoScore: item.autoScore ?? null,
          })),
        });
      }

      return tx.classExamSubmission.findUniqueOrThrow({
        where: { id: submission.id },
        include: {
          exam: true,
          student: {
            select: { id: true, name: true },
          },
          answers: {
            include: {
              question: true,
            },
          },
        },
      });
    });
  }

  async findClassExamSubmissionForTeacher(submissionId: string, teacherId: string) {
    return this.prisma.classExamSubmission.findFirst({
      where: {
        id: submissionId,
        exam: {
          teacherId,
          type: 'CLASS_EXAM',
        },
      },
      include: {
        exam: true,
        student: {
          select: { id: true, name: true },
        },
        answers: {
          include: { question: true },
        },
      },
    });
  }

  async gradeClassExamSubmission(submissionId: string, data: {
    manualScores: Array<{ answerId: string; manualScore: number }>;
    manualScore: number;
    totalScore: number;
  }) {
    return this.prisma.$transaction(async (tx) => {
      for (const item of data.manualScores) {
        await tx.classExamSubmissionAnswer.update({
          where: { id: item.answerId },
          data: { manualScore: item.manualScore },
        });
      }

      return tx.classExamSubmission.update({
        where: { id: submissionId },
        data: {
          status: 'GRADED',
          manualScore: data.manualScore,
          totalScore: data.totalScore,
          gradedAt: new Date(),
        },
        include: {
          exam: true,
          student: {
            select: { id: true, name: true },
          },
          answers: {
            include: { question: true },
          },
        },
      });
    });
  }
}
