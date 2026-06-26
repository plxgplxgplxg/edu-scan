import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ReportExportJobService } from '../../../../../src/modules/reports/services/report-export-job.service';
import {
  ReportFormat,
  ReportScope,
} from '../../../../../src/modules/reports/dto/request/export-class-report-query.dto';

describe('ReportExportJobService', () => {
  const reportsRepository = {
    findTeacherClassById: jest.fn(),
  };

  const reportsService = {
    exportClassReport: jest.fn(),
  };

  const sseRegistryService = {
    emit: jest.fn(),
    complete: jest.fn(),
  };

  let service: ReportExportJobService;

  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    service = new ReportExportJobService(
      reportsRepository as never,
      reportsService as never,
      sseRegistryService as never,
    );
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('creates job and completes it with exported file', async () => {
    reportsRepository.findTeacherClassById.mockResolvedValue({
      id: 'class-1',
      name: '12A1',
      subject: 'Math',
      schoolYear: '2025-2026',
    });
    reportsService.exportClassReport.mockResolvedValue({
      fileName: 'class-1-all-report.xlsx',
      mimeType:
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      buffer: Buffer.from('xlsx'),
    });

    const created = await service.createJob({
      classId: 'class-1',
      teacherId: 'teacher-1',
      format: ReportFormat.XLSX,
      scope: ReportScope.ALL,
    });

    expect(created.status).toBe('QUEUED');
    expect(sseRegistryService.emit).toHaveBeenCalledWith(
      `reports:${created.jobId}`,
      expect.objectContaining({
        type: 'report:queued',
        classId: 'class-1',
        format: ReportFormat.XLSX,
      }),
    );

    await jest.runAllTimersAsync();

    const completed = service.getJob(created.jobId, 'teacher-1');
    expect(completed.status).toBe('COMPLETED');
    expect(completed.fileName).toBe('class-1-all-report.xlsx');
    expect(service.getCompletedFile(created.jobId, 'teacher-1').buffer).toEqual(
      Buffer.from('xlsx'),
    );
    expect(sseRegistryService.complete).toHaveBeenCalledWith(
      `reports:${created.jobId}`,
    );
  });

  it('marks job as failed when export throws', async () => {
    reportsRepository.findTeacherClassById.mockResolvedValue({
      id: 'class-1',
      name: '12A1',
      subject: 'Math',
      schoolYear: '2025-2026',
    });
    reportsService.exportClassReport.mockRejectedValue(new Error('boom'));

    const created = await service.createJob({
      classId: 'class-1',
      teacherId: 'teacher-1',
      format: ReportFormat.PDF,
      scope: ReportScope.ALL,
    });

    await jest.runAllTimersAsync();

    expect(service.getJob(created.jobId, 'teacher-1')).toEqual(
      expect.objectContaining({
        status: 'FAILED',
        errorMessage: 'boom',
      }),
    );
    expect(() => service.getCompletedFile(created.jobId, 'teacher-1')).toThrow(
      BadRequestException,
    );
  });

  it('rejects access for missing or foreign job', () => {
    expect(() => service.getJob('missing', 'teacher-1')).toThrow(
      NotFoundException,
    );
  });
});
