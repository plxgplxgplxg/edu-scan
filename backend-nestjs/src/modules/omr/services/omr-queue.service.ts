import { InjectQueue } from '@nestjs/bull';
import { Injectable, Logger } from '@nestjs/common';
import { createHash } from 'node:crypto';
import type { Queue } from 'bull';
import {
  OMR_JOB_PROCESS_FILE,
  OMR_QUEUE_NAME,
} from '../queue/omr-queue.constants';
import { OmrQueueJobData, OmrSerializedFile } from '../queue/omr-queue.types';

type EnqueueBatchInput = {
  batchId: string;
  examId: string;
  files: Express.Multer.File[];
  templateName?: string;
};

@Injectable()
export class OmrQueueService {
  private readonly logger = new Logger(OmrQueueService.name);

  constructor(@InjectQueue(OMR_QUEUE_NAME) private readonly queue: Queue) {}

  async enqueueBatch(input: EnqueueBatchInput) {
    for (const file of input.files) {
      const serializedFile = this.serializeFile(file);
      const jobData: OmrQueueJobData = {
        batchId: input.batchId,
        examId: input.examId,
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
    }

    this.logger.log(
      `Enqueued ${input.files.length} OMR file jobs for batch ${input.batchId}`,
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
