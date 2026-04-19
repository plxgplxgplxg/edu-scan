import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';

type FindClassExamsByScopeParams = {
  classId: string;
  teacherId: string;
  scope: string;
};

type FindSubmissionsForClassScopeParams = {
  classId: string;
  teacherId: string;
  examIds: string[];
};

@Injectable()
export class ReportsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findTeacherClassById(classId: string, teacherId: string) {
    return this.prisma.class.findFirst({
      where: {
        id: classId,
        teacherId,
      },
      select: {
        id: true,
        name: true,
        subject: true,
        schoolYear: true,
      },
    });
  }

  async findClassEnrollments(classId: string, teacherId: string) {
    return this.prisma.classEnrollment.findMany({
      where: {
        classId,
        class: {
          teacherId,
        },
      },
      include: {
        student: {
          select: {
            id: true,
            studentCode: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        joinedAt: 'asc',
      },
    });
  }

  async findClassExamsByScope({
    classId,
    teacherId,
    scope,
  }: FindClassExamsByScopeParams) {
    return this.prisma.exam.findMany({
      where: {
        teacherId,
        ...(scope !== 'all' ? { id: scope } : {}),
        classes: {
          some: {
            classId,
          },
        },
      },
      select: {
        id: true,
        title: true,
        maxScore: true,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });
  }

  async findSubmissionsForClassScope({
    classId,
    teacherId,
    examIds,
  }: FindSubmissionsForClassScopeParams) {
    if (examIds.length === 0) {
      return [];
    }

    return this.prisma.submission.findMany({
      where: {
        examId: {
          in: examIds,
        },
        studentId: {
          not: null,
        },
        exam: {
          teacherId,
          classes: {
            some: {
              classId,
            },
          },
        },
      },
      include: {
        exam: {
          select: {
            id: true,
            title: true,
            maxScore: true,
          },
        },
        student: {
          select: {
            id: true,
            studentCode: true,
            name: true,
            email: true,
          },
        },
        resolvedVariant: {
          include: {
            answerKeys: {
              select: {
                questionNumber: true,
                correctAnswer: true,
              },
            },
          },
        },
        details: {
          select: {
            questionNumber: true,
            finalAnswer: true,
          },
        },
      },
      orderBy: [{ reviewedAt: 'desc' }, { createdAt: 'desc' }],
    });
  }
}
