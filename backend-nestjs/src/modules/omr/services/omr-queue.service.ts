import { InjectQueue } from '@nestjs/bull';
import { Injectable, Logger } from '@nestjs/common';
import { createHash } from 'node:crypto';
import type { Queue } from 'bull';
import {
  OMR_JOB_PROCESS_FILE,
  OMR_QUEUE_NAME,
} from '../queue/omr-queue.constants';
import { OmrQueueJobData, OmrSerializedFile } from '../queue/omr-queue.types';
import { buildOmrSseChannelId, OmrSseEvent } from '../sse/omr-sse-event';
import { SseRegistryService } from './sse-registry.service';

type EnqueueBatchInput = {
  batchId: string;
  examId: string;
  files: Express.Multer.File[];
  templateName?: string;
};

@Injectable()
export class OmrQueueService {
  private readonly logger = new Logger(OmrQueueService.name);

  constructor(
    @InjectQueue(OMR_QUEUE_NAME) private readonly queue: Queue,
    private readonly sseRegistryService: SseRegistryService<OmrSseEvent>,
  ) {}

  async enqueueBatch(input: EnqueueBatchInput) {
    const totalFiles = input.files.length;

    for (const [index, file] of input.files.entries()) {
      const serializedFile = this.serializeFile(file);
      const jobData: OmrQueueJobData = {
        batchId: input.batchId,
        examId: input.examId,
        fileIndex: index + 1,
        totalFiles,
        templateName: input.templateName,
        file: serializedFile,
      };

      const jobId = this.buildJobId(input.batchId, serializedFile);

      await this.queue.add(OMR_JOB_PROCESS_FILE, jobData, {
        jobId,
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 1000,
        },
        removeOnComplete: true,
      });

      this.sseRegistryService.emit(buildOmrSseChannelId(input.batchId), {
        type: 'batch:file:queued',
        batchId: input.batchId,
        fileIndex: index + 1,
        totalFiles,
        processedFiles: 0,
        pct: 0,
      });
    }

    this.logger.log(
      `Enqueued ${totalFiles} OMR file jobs for batch ${input.batchId}`,
    );
  }

  private serializeFile(file: Express.Multer.File): OmrSerializedFile {
    return {
      fieldname: file.fieldname,
      originalname: file.originalname,
      encoding: file.encoding,
      mimetype: file.mimetype,
      size: file.size,
      bufferBase64: file.buffer.toString('base64'),
    };
  }

  private buildJobId(batchId: string, file: OmrSerializedFile) {
    const hash = createHash('sha256')
      .update(file.originalname)
      .update(file.bufferBase64)
      .digest('hex');
    return `${batchId}:${hash}`;
  }
}
