import { Injectable, Logger } from '@nestjs/common';
import { SubmissionStatus, TestCodeResolutionStatus } from '@prisma/client';
import { OmrExam, OmrRepository } from '../repositories/omr.repository';
import { BatchService } from '../services/batch.service';
import { GradingService } from '../services/grading.service';
import { ImageUploadService } from '../services/image-upload.service';
import { OmrClientService } from '../services/omr-client.service';

type ProcessBatchInput = {
  batchId: string;
  exam: OmrExam;
  files: Express.Multer.File[];
  templateName?: string;
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
        const detectResult = await this.omrClientService.detectImage({
          imageUrl,
          templateName: input.templateName,
        });
        const variantResolution = this.gradingService.resolveVariant(
          input.exam,
          detectResult.testId,
        );
        const resolvedVariant =
          variantResolution.status === TestCodeResolutionStatus.MATCHED
            ? input.exam.variants.find(
                (variant) => variant.id === variantResolution.resolvedVariantId,
              ) ?? null
            : null;
        const preparedSubmission = this.gradingService.prepareSubmission(
          resolvedVariant?.answerKeys ?? null,
          detectResult,
          variantResolution.status,
        );

        const overlayResult =
          resolvedVariant && detectResult.artifacts?.resultJsonPath
            ? await this.omrClientService.renderGradeOverlay({
                resultJsonPath: detectResult.artifacts.resultJsonPath,
                answerKey: resolvedVariant.answerKeys.map((item) => ({
                  questionNumber: item.questionNumber,
                  correctAnswer: item.correctAnswer,
                })),
              })
            : null;

        const artifactUrls = {
          processedImageUrl: await this.imageUploadService.uploadArtifact(
            detectResult.artifacts?.processedImagePath,
            input.batchId,
          ),
          annotatedImageUrl: await this.imageUploadService.uploadArtifact(
            overlayResult?.artifacts?.annotatedImagePath ?? null,
            input.batchId,
          ),
          warpOverlayUrl: await this.imageUploadService.uploadArtifact(
            detectResult.artifacts?.warpOverlayPath,
            input.batchId,
          ),
          answerScoresUrl: await this.imageUploadService.uploadArtifact(
            detectResult.artifacts?.answerScoresPath,
            input.batchId,
          ),
        };

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
          resolvedVariantId: variantResolution.resolvedVariantId,
          imageUrl,
          studentId,
          studentCode: preparedSubmission.studentCode,
          detectedTestId: variantResolution.detectedTestId,
          resolvedTestCode: variantResolution.resolvedTestCode,
          testCodeResolutionStatus: variantResolution.status,
          status,
          details: preparedSubmission.details,
          ...artifactUrls,
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
