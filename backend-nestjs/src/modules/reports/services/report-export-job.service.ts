import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { ExportedReportFileDto } from '../dto/response/export-class-report-response.dto';
import {
  ReportFormat,
  ReportScope,
} from '../dto/request/export-class-report-query.dto';
import { ReportsRepository } from '../repositories/reports.repository';
import { ReportsService } from './reports.service';
import {
  buildReportExportSseChannelId,
  type ReportExportSseEvent,
} from '../sse/report-export-sse-event';
import { SseRegistryService } from '../../omr/services/sse-registry.service';
import { ReportExportJobResponseDto } from '../dto/response/report-export-job-response.dto';

type CreateReportExportJobInput = {
  classId: string;
  teacherId: string;
  format: ReportFormat;
  scope?: string;
};

type ReportExportJobRecord = {
  jobId: string;
  classId: string;
  teacherId: string;
  format: ReportFormat;
  scope: string;
  status: 'QUEUED' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  fileName: string | null;
  mimeType: string | null;
  errorMessage: string | null;
  file: ExportedReportFileDto | null;
  createdAt: string;
  completedAt: string | null;
};

@Injectable()
export class ReportExportJobService {
  private readonly jobs = new Map<string, ReportExportJobRecord>();

  constructor(
    private readonly reportsRepository: ReportsRepository,
    private readonly reportsService: ReportsService,
    private readonly sseRegistryService: SseRegistryService<ReportExportSseEvent>,
  ) {}

  async createJob(
    input: CreateReportExportJobInput,
  ): Promise<ReportExportJobResponseDto> {
    const scope = input.scope || ReportScope.ALL;
    const classInfo = await this.reportsRepository.findTeacherClassById(
      input.classId,
      input.teacherId,
    );

    if (!classInfo) {
      throw new NotFoundException('Class not found');
    }

    const job: ReportExportJobRecord = {
      jobId: randomUUID(),
      classId: input.classId,
      teacherId: input.teacherId,
      format: input.format,
      scope,
      status: 'QUEUED',
      fileName: null,
      mimeType: null,
      errorMessage: null,
      file: null,
      createdAt: new Date().toISOString(),
      completedAt: null,
    };

    this.jobs.set(job.jobId, job);
    this.emit(job, 'report:queued');

    setTimeout(() => {
      void this.processJob(job.jobId);
    }, 0);

    return this.toResponse(job);
  }

  getJob(jobId: string, teacherId: string): ReportExportJobResponseDto {
    return this.toResponse(this.assertTeacherJobAccess(jobId, teacherId));
  }

  getCompletedFile(jobId: string, teacherId: string): ExportedReportFileDto {
    const job = this.assertTeacherJobAccess(jobId, teacherId);

    if (job.status !== 'COMPLETED' || !job.file) {
      throw new BadRequestException('Report file is not ready yet');
    }

    return job.file;
  }

  private async processJob(jobId: string): Promise<void> {
    const job = this.jobs.get(jobId);
    if (!job) {
      return;
    }

    job.status = 'PROCESSING';
    this.emit(job, 'report:processing');

    try {
      const file = await this.reportsService.exportClassReport({
        classId: job.classId,
        teacherId: job.teacherId,
        format: job.format,
        scope: job.scope,
      });

      job.file = file;
      job.fileName = file.fileName;
      job.mimeType = file.mimeType;
      job.status = 'COMPLETED';
      job.completedAt = new Date().toISOString();
      this.emit(job, 'report:completed');
      this.sseRegistryService.complete(
        buildReportExportSseChannelId(job.jobId),
      );
    } catch (error) {
      job.status = 'FAILED';
      job.errorMessage =
        error instanceof Error ? error.message : 'Failed to export report';
      job.completedAt = new Date().toISOString();
      this.emit(job, 'report:failed');
      this.sseRegistryService.complete(
        buildReportExportSseChannelId(job.jobId),
      );
    }
  }

  private emit(
    job: ReportExportJobRecord,
    type: ReportExportSseEvent['type'],
  ): void {
    this.sseRegistryService.emit(buildReportExportSseChannelId(job.jobId), {
      type,
      jobId: job.jobId,
      classId: job.classId,
      format: job.format,
      scope: job.scope,
      fileName: job.fileName ?? undefined,
      mimeType: job.mimeType ?? undefined,
      errorMessage: job.errorMessage ?? undefined,
      createdAt: job.createdAt,
      completedAt: job.completedAt ?? undefined,
    });
  }

  private assertTeacherJobAccess(
    jobId: string,
    teacherId: string,
  ): ReportExportJobRecord {
    const job = this.jobs.get(jobId);

    if (!job || job.teacherId !== teacherId) {
      throw new NotFoundException('Report export job not found');
    }

    return job;
  }

  private toResponse(job: ReportExportJobRecord): ReportExportJobResponseDto {
    return {
      jobId: job.jobId,
      classId: job.classId,
      status: job.status,
      format: job.format,
      scope: job.scope,
      fileName: job.fileName,
      mimeType: job.mimeType,
      errorMessage: job.errorMessage,
      createdAt: job.createdAt,
      completedAt: job.completedAt,
    };
  }
}
