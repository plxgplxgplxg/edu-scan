import { Injectable } from '@nestjs/common';
import { Prisma, Role } from '@prisma/client';
import { PrismaService } from '../../../database/prisma.service';

const classDetailInclude = {
  teacher: {
    select: {
      id: true,
      name: true,
      email: true,
    },
  },
  enrollments: {
    include: {
      student: {
        select: {
          id: true,
          name: true,
          email: true,
          studentCode: true,
          isActive: true,
        },
      },
    },
    orderBy: {
      joinedAt: 'desc',
    },
  },
} satisfies Prisma.ClassInclude;

export const classListInclude = {
  teacher: {
    select: {
      id: true,
      name: true,
      email: true,
    },
  },
  _count: {
    select: {
      enrollments: true,
    },
  },
} satisfies Prisma.ClassInclude;

export type ClassLightweight = Prisma.ClassGetPayload<{
  include: typeof classListInclude;
}>;

@Injectable()
export class ClassesRepository {
  constructor(private readonly prismaService: PrismaService) {}

  async createClass(data: {
    name: string;
    subject: string;
    schoolYear: string;
    code: string;
    teacherId: string;
  }) {
    return this.prismaService.class.create({
      data,
      include: classDetailInclude,
    });
  }

  async listTeacherClasses(
    teacherId: string,
    page = 1,
    limit = 10,
    keyword?: string,
  ): Promise<[ClassLightweight[], number]> {
    const where: Prisma.ClassWhereInput = { teacherId };
    if (keyword) {
      where.OR = [
        { name: { contains: keyword, mode: 'insensitive' } },
        { code: { contains: keyword, mode: 'insensitive' } },
      ];
    }
    const [data, total] = await this.prismaService.$transaction([
      this.prismaService.class.findMany({
        where,
        include: classListInclude,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: (page - 1) * limit,
      }),
      this.prismaService.class.count({ where }),
    ]);
    return [data, total];
  }

  async listStudentClasses(
    studentId: string,
    page = 1,
    limit = 10,
    keyword?: string,
  ): Promise<[ClassLightweight[], number]> {
    const where: Prisma.ClassWhereInput = {
      enrollments: { some: { studentId } },
    };
    if (keyword) {
      where.OR = [
        { name: { contains: keyword, mode: 'insensitive' } },
        { code: { contains: keyword, mode: 'insensitive' } },
      ];
    }
    const [data, total] = await this.prismaService.$transaction([
      this.prismaService.class.findMany({
        where,
        include: classListInclude,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: (page - 1) * limit,
      }),
      this.prismaService.class.count({ where }),
    ]);
    return [data, total];
  }

  async listAllClasses(
    page = 1,
    limit = 10,
    keyword?: string,
  ): Promise<[ClassLightweight[], number]> {
    const where: Prisma.ClassWhereInput = {};
    if (keyword) {
      where.OR = [
        { name: { contains: keyword, mode: 'insensitive' } },
        { code: { contains: keyword, mode: 'insensitive' } },
      ];
    }
    const [data, total] = await this.prismaService.$transaction([
      this.prismaService.class.findMany({
        where,
        include: classListInclude,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: (page - 1) * limit,
      }),
      this.prismaService.class.count({ where }),
    ]);
    return [data, total];
  }

  async findTeacherClassById(classId: string, teacherId: string) {
    return this.prismaService.class.findFirst({
      where: {
        id: classId,
        teacherId,
      },
      include: classDetailInclude,
    });
  }

  async findStudentClassById(classId: string, studentId: string) {
    return this.prismaService.class.findFirst({
      where: {
        id: classId,
        enrollments: {
          some: {
            studentId,
          },
        },
      },
      include: classDetailInclude,
    });
  }

  async findClassById(classId: string) {
    return this.prismaService.class.findUnique({
      where: {
        id: classId,
      },
      include: classDetailInclude,
    });
  }

  async findStudentClassByCode(code: string) {
    return this.prismaService.class.findUnique({
      where: { code },
      include: classDetailInclude,
    });
  }

  async updateClass(
    classId: string,
    teacherId: string,
    data: Prisma.ClassUpdateInput,
  ) {
    await this.prismaService.class.updateMany({
      where: {
        id: classId,
        teacherId,
      },
      data,
    });

    return this.prismaService.class.findUnique({
      where: { id: classId },
      include: classDetailInclude,
    });
  }

  async deleteTeacherClass(classId: string, teacherId: string) {
    return this.prismaService.$transaction(async (tx) => {
      const assignments = await tx.assignment.findMany({
        where: { classId, teacherId },
        select: { id: true },
      });
      const assignmentIds = assignments.map((assignment) => assignment.id);

      if (assignmentIds.length > 0) {
        await tx.assignmentSubmit.deleteMany({
          where: { assignmentId: { in: assignmentIds } },
        });
        await tx.assignment.deleteMany({
          where: { id: { in: assignmentIds }, teacherId },
        });
      }

      await tx.classEnrollment.deleteMany({
        where: { classId },
      });

      await tx.examClass.deleteMany({
        where: { classId },
      });

      return tx.class.delete({
        where: { id: classId },
      });
    });
  }

  async classCodeExists(code: string) {
    const existing = await this.prismaService.class.findUnique({
      where: { code },
      select: { id: true },
    });

    return !!existing;
  }

  async findStudentForEnrollment(identifier: {
    email?: string;
    studentId?: string;
    studentCode?: string;
  }) {
    const orConditions = [
      identifier.email ? { email: identifier.email } : null,
      identifier.studentId ? { id: identifier.studentId } : null,
      identifier.studentCode ? { studentCode: identifier.studentCode } : null,
    ].filter(Boolean) as Prisma.UserWhereInput[];

    return this.prismaService.user.findFirst({
      where: {
        role: Role.STUDENT,
        isActive: true,
        OR: orConditions,
      },
      select: {
        id: true,
        email: true,
        name: true,
        studentCode: true,
      },
    });
  }

  async enrollmentExists(classId: string, studentId: string) {
    const enrollment = await this.prismaService.classEnrollment.findUnique({
      where: {
        classId_studentId: {
          classId,
          studentId,
        },
      },
      select: { id: true },
    });

    return !!enrollment;
  }

  async searchAvailableStudents(classId: string, keyword: string, page = 1, limit = 10) {
    const skip = (page - 1) * limit;
    const where: Prisma.UserWhereInput = {
      role: Role.STUDENT,
      isActive: true,
      enrollments: {
        none: { classId }
      }
    };

    if (keyword) {
      where.OR = [
        { name: { contains: keyword, mode: 'insensitive' } },
        { email: { contains: keyword, mode: 'insensitive' } },
        { studentCode: { contains: keyword, mode: 'insensitive' } },
      ];
    }

    const [items, total] = await this.prismaService.$transaction([
      this.prismaService.user.findMany({
        where,
        select: {
          id: true,
          email: true,
          name: true,
          studentCode: true,
        },
        skip,
        take: limit,
        orderBy: { name: 'asc' },
      }),
      this.prismaService.user.count({ where }),
    ]);

    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async addStudentToClass(classId: string, studentId: string) {
    return this.prismaService.classEnrollment.create({
      data: {
        classId,
        studentId,
      },
      include: {
        student: {
          select: {
            id: true,
            name: true,
            email: true,
            studentCode: true,
          },
        },
      },
    });
  }

  async removeStudentFromClass(classId: string, studentId: string) {
    return this.prismaService.classEnrollment.delete({
      where: {
        classId_studentId: {
          classId,
          studentId,
        },
      },
    });
  }

  async findStudentEnrollment(classId: string, studentId: string) {
    return this.prismaService.classEnrollment.findUnique({
      where: {
        classId_studentId: {
          classId,
          studentId,
        },
      },
      include: {
        class: {
          include: classDetailInclude,
        },
      },
    });
  }
}
