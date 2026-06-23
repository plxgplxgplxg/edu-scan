import { StreamableFile } from '@nestjs/common';
import { Role } from '@prisma/client';
import { of } from 'rxjs';
import { ReportsController } from '../../../../../src/modules/reports/controllers/reports.controller';
import {
  ReportFormat,
  ReportScope,
} from '../../../../../src/modules/reports/dto/request/export-class-report-query.dto';

describe('ReportsController', () => {
  const reportsService = {
    exportClassReport: jest.fn(),
  };
  const reportExportJobService = {
    createJob: jest.fn(),
    getJob: jest.fn(),
    getCompletedFile: jest.fn(),
  };
  const sseRegistryService = {
    stream: jest.fn(),
  };

  const response = {
    setHeader: jest.fn(),
  };

  let controller: ReportsController;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new ReportsController(
      reportsService as never,
      reportExportJobService as never,
      sseRegistryService as never,
    );
  });

  it('sets download headers for xlsx', async () => {
    reportsService.exportClassReport.mockResolvedValue({
      fileName: 'class-1-report.xlsx',
      mimeType:
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      buffer: Buffer.from('xlsx'),
    });

    const file = await controller.exportClassReport(
      'class-1',
      { format: ReportFormat.XLSX, scope: ReportScope.ALL },
      { id: 'teacher-1', role: Role.TEACHER } as never,
      response as never,
    );

    expect(file).toBeInstanceOf(StreamableFile);
    expect(response.setHeader).toHaveBeenCalledWith(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    expect(response.setHeader).toHaveBeenCalledWith(
      'Content-Disposition',
      'attachment; filename="class-1-report.xlsx"',
    );
  });

  it('sets download headers for pdf', async () => {
    reportsService.exportClassReport.mockResolvedValue({
      fileName: 'class-1-report.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from('pdf'),
    });

    await controller.exportClassReport(
      'class-1',
      { format: ReportFormat.PDF, scope: 'exam-1' },
      { id: 'teacher-1', role: Role.TEACHER } as never,
      response as never,
    );

    expect(response.setHeader).toHaveBeenCalledWith(
      'Content-Type',
      'application/pdf',
    );
    expect(response.setHeader).toHaveBeenCalledWith(
      'Content-Disposition',
      'attachment; filename="class-1-report.pdf"',
    );
  });

  it('creates async export job', async () => {
    reportExportJobService.createJob.mockResolvedValue({
      jobId: 'job-1',
      classId: 'class-1',
      status: 'QUEUED',
      format: ReportFormat.XLSX,
      scope: ReportScope.ALL,
      fileName: null,
      mimeType: null,
      errorMessage: null,
      createdAt: '2026-06-23T00:00:00.000Z',
      completedAt: null,
    });

    await expect(
      controller.createExportJob(
        'class-1',
        { format: ReportFormat.XLSX, scope: ReportScope.ALL },
        { id: 'teacher-1', role: Role.TEACHER } as never,
      ),
    ).resolves.toEqual(expect.objectContaining({ jobId: 'job-1' }));
  });

  it('streams export job events through SSE registry', async () => {
    reportExportJobService.getJob.mockReturnValue({
      jobId: 'job-1',
      classId: 'class-1',
      status: 'PROCESSING',
      format: ReportFormat.XLSX,
      scope: ReportScope.ALL,
      fileName: null,
      mimeType: null,
      errorMessage: null,
      createdAt: '2026-06-23T00:00:00.000Z',
      completedAt: null,
    });
    sseRegistryService.stream.mockReturnValue(
      of({
        type: 'report:processing',
        jobId: 'job-1',
        classId: 'class-1',
        format: 'xlsx',
        scope: 'all',
        createdAt: '2026-06-23T00:00:00.000Z',
      }),
    );

    const events = await new Promise<any[]>((resolve, reject) => {
      const collected: any[] = [];

      controller
        .streamExportJob(
          'job-1',
          { id: 'teacher-1', role: Role.TEACHER } as never,
        )
        .subscribe({
          next: (value) => collected.push(value),
          error: reject,
          complete: () => resolve(collected),
        });
    });

    expect(events).toEqual([
      {
        type: 'report:processing',
        data: expect.objectContaining({
          type: 'report:processing',
          jobId: 'job-1',
        }),
      },
    ]);
  });
});
