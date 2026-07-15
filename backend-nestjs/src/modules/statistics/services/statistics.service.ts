import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { Role, Prisma, SubmissionStatus, User } from '@prisma/client';

@Injectable()
export class StatisticsService {
  constructor(private prisma: PrismaService) {}

  async getTeacherStats(teacherId: string, timeRange?: string) {
    const totalClasses = await this.prisma.class.count({
      where: { teacherId },
    });

    const uniqueStudentsResult = await this.prisma.classEnrollment.findMany({
      where: { class: { teacherId } },
      select: { studentId: true },
      distinct: ['studentId'],
    });
    const totalUniqueStudents = uniqueStudentsResult.length;

    const startOfRange = new Date();
    if (timeRange === 'week') {
      startOfRange.setDate(startOfRange.getDate() - startOfRange.getDay());
      startOfRange.setHours(0, 0, 0, 0);
    } else if (timeRange === 'month') {
      startOfRange.setDate(1);
      startOfRange.setHours(0, 0, 0, 0);
    } else {
      startOfRange.setFullYear(2000); // effectively all time
    }

    const now = new Date();

    const activeAssignmentsThisMonth = await this.prisma.assignment.count({
      where: {
        teacherId,
        createdAt: { gte: startOfRange },
        deadline: { gt: now },
      },
    });

    const expiredAssignmentsThisMonth = await this.prisma.assignment.count({
      where: {
        teacherId,
        createdAt: { gte: startOfRange },
        deadline: { lte: now },
      },
    });

    const totalExams = await this.prisma.exam.count({
      where: { teacherId },
    });

    const totalOmrSubmissions = await this.prisma.submission.count({
      where: {
        exam: { teacherId },
        status: SubmissionStatus.GRADED,
      },
    });

    const [
      classesData,
      studentCountsByClass,
      examsData,
      gradedSubmissionsByExam,
    ] = await this.prisma.$transaction([
      this.prisma.class.findMany({
        where: { teacherId },
        select: {
          id: true,
          name: true,
        },
        orderBy: {
          createdAt: 'asc',
        },
      }),
      this.prisma.classEnrollment.groupBy({
        by: ['classId'],
        orderBy: {
          classId: 'asc',
        },
        where: {
          class: { teacherId },
        },
        _count: {
          _all: true,
        },
      }),
      this.prisma.exam.findMany({
        where: { teacherId },
        select: {
          id: true,
          title: true,
        },
        orderBy: {
          createdAt: 'asc',
        },
      }),
      this.prisma.submission.groupBy({
        by: ['examId'],
        orderBy: {
          examId: 'asc',
        },
        where: {
          exam: { teacherId },
          status: SubmissionStatus.GRADED,
        },
        _count: {
          _all: true,
        },
      }),
    ]);

    const groupedStudentCounts = studentCountsByClass as Array<{
      classId: string;
      _count: { _all: number };
    }>;
    const studentCountLookup = new Map(
      groupedStudentCounts.map((item) => [item.classId, item._count._all]),
    );
    const studentsPerClass = classesData.map((classItem) => ({
      className: classItem.name,
      count: studentCountLookup.get(classItem.id) ?? 0,
    }));

    const groupedSubmissionCounts = gradedSubmissionsByExam as Array<{
      examId: string;
      _count: { _all: number };
    }>;
    const gradedSubmissionLookup = new Map(
      groupedSubmissionCounts.map((item) => [item.examId, item._count._all]),
    );
    const submissionsPerExam = examsData.map((examItem) => ({
      examTitle: examItem.title,
      count: gradedSubmissionLookup.get(examItem.id) ?? 0,
    }));

    return {
      totalClasses,
      totalUniqueStudents,
      activeAssignmentsThisMonth,
      expiredAssignmentsThisMonth,
      totalExams,
      totalOmrSubmissions,
      studentsPerClass,
      submissionsPerExam,
    };
  }

  async getStudentStats(studentId: string) {
    const totalClasses = await this.prisma.classEnrollment.count({
      where: { studentId },
    });

    const submits = await this.prisma.assignmentSubmit.findMany({
      where: { studentId },
      select: { submitStatus: true, assignmentId: true },
    });

    const onTimeSubmits = submits.filter(
      (s) => s.submitStatus === 'ON_TIME',
    ).length;
    const lateSubmits = submits.filter((s) => s.submitStatus === 'LATE').length;

    const enrolledClasses = await this.prisma.classEnrollment.findMany({
      where: { studentId },
      select: { classId: true },
    });
    const classIds = enrolledClasses.map((c) => c.classId);

    const totalAssignments = await this.prisma.assignment.count({
      where: { classId: { in: classIds } },
    });

    const missingSubmits = totalAssignments - submits.length;

    return {
      totalClasses,
      onTimeSubmits,
      lateSubmits,
      missingSubmits: missingSubmits > 0 ? missingSubmits : 0,
    };
  }

  async getAdminStats(query: {
    page?: number;
    limit?: number;
    search?: string;
  }) {
    const totalTeachers = await this.prisma.user.count({
      where: { role: Role.TEACHER },
    });
    const totalStudents = await this.prisma.user.count({
      where: { role: Role.STUDENT },
    });
    const totalClasses = await this.prisma.class.count();

    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 10;
    const skip = (page - 1) * limit;

    const whereClause: Prisma.ClassWhereInput = {};
    if (query.search) {
      whereClause.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { code: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const classesList = await this.prisma.class.findMany({
      where: whereClause,
      include: {
        teacher: { select: { id: true, name: true, email: true } },
        _count: { select: { enrollments: true } },
      },
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
    });

    const totalClassesFiltered = await this.prisma.class.count({
      where: whereClause,
    });

    return {
      overview: {
        totalTeachers,
        totalStudents,
        totalClasses,
      },
      classes: {
        data: classesList.map((c) => ({
          id: c.id,
          name: c.name,
          code: c.code,
          subject: c.subject,
          teacherName: c.teacher.name,
          studentCount: c._count.enrollments,
        })),
        meta: {
          total: totalClassesFiltered,
          page,
          limit,
          totalPages: Math.ceil(totalClassesFiltered / limit),
        },
      },
    };
  }

  async getTeacherClassStats(teacherId: string, classId: string) {
    const cls = await this.prisma.class.findUnique({
      where: { id: classId },
      include: {
        _count: { select: { enrollments: true } },
      },
    });
    if (!cls || cls.teacherId !== teacherId) {
      throw new NotFoundException('Class not found');
    }

    const studentCount = cls._count.enrollments;

    const now = new Date();
    const activeAssignments = await this.prisma.assignment.count({
      where: { classId, deadline: { gt: now } },
    });

    const assignments = await this.prisma.assignment.findMany({
      where: { classId },
      include: { _count: { select: { submits: true } } },
    });

    let totalSubmits = 0;
    let expectedSubmits = 0;

    for (const a of assignments) {
      totalSubmits += a._count.submits;
      expectedSubmits += studentCount;
    }

    const submissionRate =
      expectedSubmits > 0 ? (totalSubmits / expectedSubmits) * 100 : 0;

    return {
      studentCount,
      activeAssignments,
      submissionRate: Math.round(submissionRate * 100) / 100,
    };
  }

  async getTeacherLateMissingStudents(
    teacherId: string,
    query: {
      classId?: string;
      timeRange?: string;
      page?: number;
      limit?: number;
    },
  ) {
    const { classId, timeRange, page = 1, limit = 10 } = query;
    const now = new Date();
    const startDate = new Date();

    if (timeRange === 'month') {
      startDate.setDate(1);
      startDate.setHours(0, 0, 0, 0);
    } else if (timeRange === 'week') {
      startDate.setDate(startDate.getDate() - startDate.getDay());
      startDate.setHours(0, 0, 0, 0);
    } else {
      startDate.setFullYear(2000); // effectively all time
    }

    const whereClause: Prisma.AssignmentWhereInput = {
      teacherId,
      deadline: { lt: now, gte: startDate },
    };

    if (classId) {
      whereClause.classId = classId;
    }

    const pastAssignments = await this.prisma.assignment.findMany({
      where: whereClause,
      include: {
        class: {
          include: {
            enrollments: {
              include: { student: true },
            },
          },
        },
        submits: true,
      },
    });

    const studentStats: Record<
      string,
      { student: User; lateCount: number; missingCount: number }
    > = {};

    for (const assignment of pastAssignments) {
      const enrolledStudents = assignment.class.enrollments.map(
        (e) => e.student,
      );
      const submits = assignment.submits;

      for (const student of enrolledStudents) {
        if (!studentStats[student.id]) {
          studentStats[student.id] = { student, lateCount: 0, missingCount: 0 };
        }

        const submit = submits.find((s) => s.studentId === student.id);
        if (!submit) {
          studentStats[student.id].missingCount++;
        } else if (submit.submitStatus === 'LATE') {
          studentStats[student.id].lateCount++;
        }
      }
    }

    const result = Object.values(studentStats)
      .filter((s) => s.lateCount > 0 || s.missingCount > 0)
      .map((s) => ({
        id: s.student.id,
        name: s.student.name,
        email: s.student.email,
        studentCode: s.student.studentCode,
        lateCount: s.lateCount,
        missingCount: s.missingCount,
        totalIssues: s.lateCount + s.missingCount,
      }))
      .sort((a, b) => b.totalIssues - a.totalIssues);

    const total = result.length;
    const skip = (page - 1) * limit;
    const paginatedData = result.slice(skip, skip + limit);

    return {
      data: paginatedData,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getProfileStats(userId: string, role: Role) {
    if (role === Role.TEACHER) {
      const [classes, exams, omrBatches] = await Promise.all([
        this.prisma.class.count({ where: { teacherId: userId } }),
        this.prisma.exam.count({ where: { teacherId: userId } }),
        this.prisma.omrBatch.count({ where: { teacherId: userId } }),
      ]);
      return { classes, exams, omrBatches };
    }
    if (role === Role.STUDENT) {
      const classes = await this.prisma.classEnrollment.count({
        where: { studentId: userId },
      });
      const pendingAssignments = await this.prisma.assignment.count({
        where: {
          class: { enrollments: { some: { studentId: userId } } },
          submits: { none: { studentId: userId } },
        },
      });
      return { classes, assignments: pendingAssignments };
    }
    return {};
  }
}
