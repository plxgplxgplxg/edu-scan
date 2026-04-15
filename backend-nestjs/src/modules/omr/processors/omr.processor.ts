import { Injectable, Logger } from '@nestjs/common';
import { SubmissionStatus } from '@prisma/client';
import { OmrExam, OmrRepository } from '../repositories/omr.repository';
import { BatchService } from '../services/batch.service';
import { GradingService } from '../services/grading.service';
import { ImageUploadService } from '../services/image-upload.service';
import { OmrClientService } from '../services/omr-client.service';

type ProcessBatchInput = {
  batchId: string;
  exam: OmrExam;
  files: Express.Multer.File[];
};

@Injectable()
export class OmrProcessor {
  private readonly logger = new Logger(OmrProcessor.name);

  constructor(
    private readonly batchService: BatchService,
    private readonly imageUploadService: ImageUploadService,
    private readonly omrClientService: OmrClientService,
    private readonly gradingService: GradingService,
    private readonly omrRepository: OmrRepository,
  ) {}

  async processBatch(input: ProcessBatchInput) {
    await this.batchService.markProcessing(input.batchId);

    for (const file of input.files) {
      try {
        const imageUrl = await this.imageUploadService.uploadFile(
          file,
          input.batchId,
        );
        const omrResult = await this.omrClientService.processImage({
          imageUrl,
          questionCount: input.exam.answerKeys.length,
        });

        const preparedSubmission = this.gradingService.prepareSubmission(
          input.exam,
          omrResult,
        );

        let studentId: string | null = null;
        let status = preparedSubmission.status;

        if (preparedSubmission.studentCode) {
          const student = await this.omrRepository.findEligibleStudentForExam(
            input.exam.id,
            preparedSubmission.studentCode,
          );

          if (student) {
            studentId = student.id;
          } else {
            status = SubmissionStatus.NEEDS_REVIEW;
          }
        }

        await this.batchService.recordSuccessfulFile({
          batchId: input.batchId,
          examId: input.exam.id,
          imageUrl,
          studentId,
          studentCode: preparedSubmission.studentCode,
          status,
          details: preparedSubmission.details,
        });
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : 'Unknown batch processing error';
        this.logger.error(
          `Failed to process file ${file.originalname}: ${message}`,
        );
        await this.batchService.recordFailedFile(input.batchId);
      }
    }
  }
}
