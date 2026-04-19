import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import type { Job } from 'bull';
import {
  OMR_JOB_PROCESS_FILE,
  OMR_QUEUE_NAME,
} from '../queue/omr-queue.constants';
import { OmrQueueJobData } from '../queue/omr-queue.types';
import { OmrProcessor } from './omr.processor';
import { OmrBatchStateUpdaterService } from '../services/omr-batch-state-updater.service';

@Processor(OMR_QUEUE_NAME)
export class OmrQueueProcessor {
  private readonly logger = new Logger(OmrQueueProcessor.name);

  constructor(
    private readonly omrProcessor: OmrProcessor,
    private readonly batchStateUpdater: OmrBatchStateUpdaterService,
  ) {}

  @Process(OMR_JOB_PROCESS_FILE)
  async handleProcessFile(job: Job<OmrQueueJobData>) {
    const { batchId, file } = job.data;
    await this.batchStateUpdater.markProcessing(batchId);

    try {
      const submissionPayload = await this.omrProcessor.processJob(job.data);
      await this.batchStateUpdater.recordSuccessfulFile(submissionPayload);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unknown OMR processing error';
      const attempt = job.attemptsMade + 1;
      const maxAttempts = job.opts.attempts ?? 1;
      this.logger.error(
        `Failed OMR job (batch=${batchId}, file=${file.originalname}, attempt=${attempt}/${maxAttempts}): ${message}`,
      );

      if (attempt >= maxAttempts) {
        await this.batchStateUpdater.recordFailedFile(batchId);
      }

      throw error;
    }
  }
}
