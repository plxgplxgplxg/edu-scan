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

  async listTeacherClasses(teacherId: string): Promise<ClassLightweight[]> {
    return this.prismaService.class.findMany({
      where: { teacherId },
      include: classListInclude,
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async listStudentClasses(studentId: string): Promise<ClassLightweight[]> {
    return this.prismaService.class.findMany({
      where: {
        enrollments: {
          some: {
            studentId,
          },
        },
      },
      include: classListInclude,
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async listAllClasses(): Promise<ClassLightweight[]> {
    return this.prismaService.class.findMany({
      include: classListInclude,
      orderBy: {
        createdAt: 'desc',
      },
    });
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
