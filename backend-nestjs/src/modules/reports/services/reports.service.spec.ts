import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ReportsService } from './reports.service';
import {
  ReportFormat,
  ReportScope,
} from '../dto/request/export-class-report-query.dto';

describe('ReportsService', () => {
  const repository = {
    findTeacherClassById: jest.fn(),
    findClassEnrollments: jest.fn(),
    findClassExamsByScope: jest.fn(),
    findSubmissionsForClassScope: jest.fn(),
  };

  const excelGenerator = {
    generate: jest.fn(),
  };

  const pdfGenerator = {
    generate: jest.fn(),
  };

  let service: ReportsService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new ReportsService(
      repository as never,
      excelGenerator as never,
      pdfGenerator as never,
    );
  });

  it('rejects export when teacher does not own class', async () => {
    repository.findTeacherClassById.mockResolvedValue(null);

    await expect(
      service.exportClassReport({
        classId: 'class-1',
        teacherId: 'teacher-1',
        format: ReportFormat.XLSX,
        scope: ReportScope.ALL,
      }),
    ).rejects.toThrow(NotFoundException);
  });

  it('filters by exam scope and returns xlsx payload', async () => {
    repository.findTeacherClassById.mockResolvedValue({
      id: 'class-1',
      name: 'Class 12A1',
      subject: 'Math',
      schoolYear: '2025-2026',
    });
    repository.findClassEnrollments.mockResolvedValue([
      {
        student: {
          id: 'student-1',
          studentCode: 'S001',
          name: 'Alice',
          email: 'alice@example.com',
        },
      },
    ]);
    repository.findClassExamsByScope.mockResolvedValue([
      {
        id: 'exam-1',
        title: 'Midterm',
        maxScore: 10,
      },
    ]);
    repository.findSubmissionsForClassScope.mockResolvedValue([
      {
        id: 'sub-1',
        studentId: 'student-1',
        createdAt: new Date('2026-04-17T12:00:00.000Z'),
        reviewedAt: null,
        exam: {
          id: 'exam-1',
          title: 'Midterm',
          maxScore: 10,
        },
        student: {
          id: 'student-1',
          studentCode: 'S001',
          name: 'Alice',
          email: 'alice@example.com',
        },
        details: [
          { questionNumber: 1, finalAnswer: 'A' },
          { questionNumber: 2, finalAnswer: 'B' },
        ],
        resolvedVariant: {
          answerKeys: [
            { questionNumber: 1, correctAnswer: 'A' },
            { questionNumber: 2, correctAnswer: 'C' },
          ],
        },
      },
    ]);
    excelGenerator.generate.mockResolvedValue(Buffer.from('xlsx-content'));

    const output = await service.exportClassReport({
      classId: 'class-1',
      teacherId: 'teacher-1',
      format: ReportFormat.XLSX,
      scope: 'exam-1',
    });

    expect(repository.findClassExamsByScope).toHaveBeenCalledWith({
      classId: 'class-1',
      teacherId: 'teacher-1',
      scope: 'exam-1',
    });
    expect(output.mimeType).toBe(
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    expect(output.fileName).toContain('exam-1');
    expect(output.buffer).toEqual(Buffer.from('xlsx-content'));
  });

  it('uses all scope and selects pdf generator', async () => {
    repository.findTeacherClassById.mockResolvedValue({
      id: 'class-1',
      name: 'Class 12A1',
      subject: 'Math',
      schoolYear: '2025-2026',
    });
    repository.findClassEnrollments.mockResolvedValue([
      {
        student: {
          id: 'student-1',
          studentCode: 'S001',
          name: 'Alice',
          email: 'alice@example.com',
        },
      },
    ]);
    repository.findClassExamsByScope.mockResolvedValue([
      {
        id: 'exam-1',
        title: 'Midterm',
        maxScore: 10,
      },
      {
        id: 'exam-2',
        title: 'Final',
        maxScore: 10,
      },
    ]);
    repository.findSubmissionsForClassScope.mockResolvedValue([]);
    pdfGenerator.generate.mockResolvedValue(Buffer.from('pdf-content'));

    await expect(
      service.exportClassReport({
        classId: 'class-1',
        teacherId: 'teacher-1',
        format: ReportFormat.PDF,
        scope: ReportScope.ALL,
      }),
    ).rejects.toThrow(BadRequestException);

    expect(pdfGenerator.generate).not.toHaveBeenCalled();
  });
});
