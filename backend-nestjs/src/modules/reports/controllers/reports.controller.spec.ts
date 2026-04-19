import { StreamableFile } from '@nestjs/common';
import { Role } from '@prisma/client';
import { ReportsController } from './reports.controller';
import {
  ReportFormat,
  ReportScope,
} from '../dto/request/export-class-report-query.dto';

describe('ReportsController', () => {
  const reportsService = {
    exportClassReport: jest.fn(),
  };

  const response = {
    setHeader: jest.fn(),
  };

  let controller: ReportsController;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new ReportsController(reportsService as never);
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
});
