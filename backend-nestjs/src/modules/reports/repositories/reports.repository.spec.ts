import { ReportsRepository } from './reports.repository';

describe('ReportsRepository', () => {
  const prisma = {
    class: {
      findFirst: jest.fn(),
    },
    classEnrollment: {
      findMany: jest.fn(),
    },
    exam: {
      findMany: jest.fn(),
    },
    submission: {
      findMany: jest.fn(),
    },
  };

  let repository: ReportsRepository;

  beforeEach(() => {
    jest.clearAllMocks();
    repository = new ReportsRepository(prisma as never);
  });

  it('queries exams in all scope with ownership condition', async () => {
    prisma.exam.findMany.mockResolvedValue([]);

    await repository.findClassExamsByScope({
      classId: 'class-1',
      teacherId: 'teacher-1',
      scope: 'all',
    });

    expect(prisma.exam.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          teacherId: 'teacher-1',
          classes: {
            some: {
              classId: 'class-1',
            },
          },
        },
      }),
    );
  });

  it('queries submissions with exam filter when scope is examId', async () => {
    prisma.submission.findMany.mockResolvedValue([]);

    await repository.findSubmissionsForClassScope({
      classId: 'class-1',
      teacherId: 'teacher-1',
      examIds: ['exam-2'],
    });

    expect(prisma.submission.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          examId: {
            in: ['exam-2'],
          },
          studentId: {
            not: null,
          },
          exam: {
            teacherId: 'teacher-1',
            classes: {
              some: {
                classId: 'class-1',
              },
            },
          },
        },
      }),
    );
  });
});
