import { SubmissionStatus } from '@prisma/client';
import { StatisticsService } from '../../../../../src/modules/statistics/services/statistics.service';

describe('StatisticsService', () => {
  const prisma = {
    class: {
      count: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
    },
    classEnrollment: {
      findMany: jest.fn(),
      count: jest.fn(),
      groupBy: jest.fn(),
    },
    assignment: {
      count: jest.fn(),
      findMany: jest.fn(),
    },
    exam: {
      count: jest.fn(),
      findMany: jest.fn(),
    },
    submission: {
      count: jest.fn(),
      groupBy: jest.fn(),
    },
    user: {
      count: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  let service: StatisticsService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new StatisticsService(prisma as never);
  });

  it('aggregates chart data for teacher statistics from grouped records', async () => {
    prisma.class.count.mockResolvedValue(2);
    prisma.classEnrollment.findMany.mockResolvedValue([
      { studentId: 'student-1' },
      { studentId: 'student-2' },
    ]);
    prisma.assignment.count
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(0);
    prisma.exam.count.mockResolvedValue(2);
    prisma.submission.count.mockResolvedValue(3);
    prisma.$transaction.mockResolvedValue([
      [
        { id: 'class-1', name: '12A1' },
        { id: 'class-2', name: '12A2' },
      ],
      [
        { classId: 'class-1', _count: { _all: 2 } },
      ],
      [
        { id: 'exam-1', title: 'Giua ky' },
        { id: 'exam-2', title: 'Cuoi ky' },
      ],
      [
        { examId: 'exam-1', _count: { _all: 3 } },
      ],
    ]);

    const result = await service.getTeacherStats('teacher-1', 'month');

    expect(prisma.submission.count).toHaveBeenCalledWith({
      where: {
        exam: { teacherId: 'teacher-1' },
        status: SubmissionStatus.GRADED,
      },
    });
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(result.studentsPerClass).toEqual([
      { className: '12A1', count: 2 },
      { className: '12A2', count: 0 },
    ]);
    expect(result.submissionsPerExam).toEqual([
      { examTitle: 'Giua ky', count: 3 },
      { examTitle: 'Cuoi ky', count: 0 },
    ]);
    expect(result.totalOmrSubmissions).toBe(3);
  });
});
