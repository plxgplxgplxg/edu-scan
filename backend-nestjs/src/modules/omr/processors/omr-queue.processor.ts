import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import type { Job } from 'bull';
import {
  OMR_JOB_PROCESS_FILE,
  OMR_QUEUE_NAME,
} from '../queue/omr-queue.constants';
import { OmrQueueJobData } from '../queue/omr-queue.types';
import { buildOmrSseChannelId, OmrSseEvent } from '../sse/omr-sse-event';
import { OmrProcessor } from './omr.processor';
import { OmrBatchStateUpdaterService } from '../services/omr-batch-state-updater.service';
import { SseRegistryService } from '../services/sse-registry.service';

@Processor(OMR_QUEUE_NAME)
export class OmrQueueProcessor {
  private readonly logger = new Logger(OmrQueueProcessor.name);

  constructor(
    private readonly omrProcessor: OmrProcessor,
    private readonly batchStateUpdater: OmrBatchStateUpdaterService,
    private readonly sseRegistryService: SseRegistryService<OmrSseEvent>,
  ) {}

  @Process(OMR_JOB_PROCESS_FILE)
  async handleProcessFile(job: Job<OmrQueueJobData>) {
    const { batchId, file, fileIndex, totalFiles } = job.data;
    await this.batchStateUpdater.markProcessing(batchId);
    this.sseRegistryService.emit(buildOmrSseChannelId(batchId), {
      type: 'batch:file:uploading',
      batchId,
      fileIndex,
      totalFiles,
      stage: 'uploading',
    });

    try {
      const submissionPayload = await this.omrProcessor.processJob(job.data, {
        onProcessingStart: () =>
          this.sseRegistryService.emit(buildOmrSseChannelId(batchId), {
            type: 'batch:file:processing',
            batchId,
            fileIndex,
            totalFiles,
            stage: 'processing',
          }),
      });
      const batch =
        await this.batchStateUpdater.recordSuccessfulFile(submissionPayload);
      this.sseRegistryService.emit(buildOmrSseChannelId(batchId), {
        type: 'batch:file:done',
        batchId,
        fileIndex,
        totalFiles: batch.totalFiles,
        processedFiles: batch.processedFiles,
        pct: this.calculateProgressPercentage(
          batch.processedFiles,
          batch.totalFiles,
        ),
        stage: 'done',
        studentCode: submissionPayload.studentCode,
        score: submissionPayload.score,
        needsReview: submissionPayload.needsReview,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unknown OMR processing error';
      const attempt = job.attemptsMade + 1;
      const maxAttempts = job.opts.attempts ?? 1;
      this.logger.error(
        `Failed OMR job (batch=${batchId}, file=${file.originalname}, attempt=${attempt}/${maxAttempts}): ${message}`,
      );

      if (attempt >= maxAttempts) {
        const batch = await this.batchStateUpdater.recordFailedFile(batchId);
        this.sseRegistryService.emit(buildOmrSseChannelId(batchId), {
          type: 'batch:file:failed',
          batchId,
          fileIndex,
          totalFiles: batch.totalFiles,
          processedFiles: batch.processedFiles,
          pct: this.calculateProgressPercentage(
            batch.processedFiles,
            batch.totalFiles,
          ),
          stage: 'failed',
          errorMessage: message,
        });
      }

      throw error;
    }
  }

  private calculateProgressPercentage(
    processedFiles: number,
    totalFiles: number,
  ) {
    if (totalFiles === 0) {
      return 0;
    }

    return Math.round((processedFiles / totalFiles) * 100);
  }
}
