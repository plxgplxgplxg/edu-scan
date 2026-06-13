import { Injectable, Logger } from '@nestjs/common';
import { SubmissionStatus, TestCodeResolutionStatus } from '@prisma/client';
import { OmrRepository } from '../repositories/omr.repository';
import {
  PreparedSubmissionDetail,
  GradingService,
} from '../services/grading.service';
import { ImageUploadService } from '../services/image-upload.service';
import { OmrQueueJobData, OmrSerializedFile } from '../queue/omr-queue.types';
import {
  OMR_TRANSPORT_CLIENT,
} from '../interfaces/omr-transport.interface';
import { Inject } from '@nestjs/common';
import type { OmrTransportClient } from '../interfaces/omr-transport.interface';

export type ProcessedSubmissionPayload = {
  batchId: string;
  examId: string;
  resolvedVariantId: string | null;
  imageUrl: string;
  studentId: string | null;
  studentCode: string | null;
  studentCodeRaw: string | null;
  matchedStudentId: string | null;
  isExternal: boolean;
  detectedTestId: string | null;
  resolvedTestCode: string | null;
  testCodeResolutionStatus: TestCodeResolutionStatus;
  status: SubmissionStatus;
  details: PreparedSubmissionDetail[];
  processedImageUrl?: string | null;
  annotatedImageUrl?: string | null;
  warpOverlayUrl?: string | null;
  answerScoresUrl?: string | null;
};

@Injectable()
export class OmrProcessor {
  private readonly logger = new Logger(OmrProcessor.name);

  constructor(
    private readonly imageUploadService: ImageUploadService,
    @Inject(OMR_TRANSPORT_CLIENT)
    private readonly omrClientService: OmrTransportClient,
    private readonly gradingService: GradingService,
    private readonly omrRepository: OmrRepository,
  ) {}

  async processJob(data: OmrQueueJobData): Promise<ProcessedSubmissionPayload> {
    const exam = await this.omrRepository.findExamById(data.examId);
    if (!exam) {
      throw new Error(
        `Exam ${data.examId} not found for batch ${data.batchId}`,
      );
    }

    const file = this.deserializeFile(data.file);
    const imageUrl = await this.imageUploadService.uploadFile(
      file,
      data.batchId,
    );
    const detectResult = await this.omrClientService.detectImage({
      imageUrl,
      templateName: data.templateName,
    });
    const variantResolution = this.gradingService.resolveVariant(
      exam,
      detectResult.testId,
    );
    const resolvedVariant =
      variantResolution.status === TestCodeResolutionStatus.MATCHED
        ? (exam.variants.find(
            (variant) => variant.id === variantResolution.resolvedVariantId,
          ) ?? null)
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
        data.batchId,
      ),
      annotatedImageUrl: await this.imageUploadService.uploadArtifact(
        overlayResult?.artifacts?.annotatedImagePath ?? null,
        data.batchId,
      ),
      warpOverlayUrl: await this.imageUploadService.uploadArtifact(
        detectResult.artifacts?.warpOverlayPath,
        data.batchId,
      ),
      answerScoresUrl: await this.imageUploadService.uploadArtifact(
        detectResult.artifacts?.answerScoresPath,
        data.batchId,
      ),
    };

    let studentId: string | null = null;
    let status = preparedSubmission.status;

    if (preparedSubmission.studentCode) {
      const student = await this.omrRepository.findStudentByStudentCode(
        preparedSubmission.studentCode,
      );

      if (student) {
        studentId = student.id;
      }
    }

    const submissionPayload: ProcessedSubmissionPayload = {
      batchId: data.batchId,
      examId: exam.id,
      resolvedVariantId: variantResolution.resolvedVariantId,
      imageUrl,
      studentId,
      studentCode: preparedSubmission.studentCode,
      studentCodeRaw: preparedSubmission.studentCode,
      matchedStudentId: studentId,
      isExternal: !studentId,
      detectedTestId: variantResolution.detectedTestId,
      resolvedTestCode: variantResolution.resolvedTestCode,
      testCodeResolutionStatus: variantResolution.status,
      status,
      details: preparedSubmission.details,
      ...artifactUrls,
    };

    this.logger.log(
      `Processed OMR file ${data.file.originalname} for batch ${data.batchId}`,
    );
    return submissionPayload;
  }

  private deserializeFile(file: OmrSerializedFile): Express.Multer.File {
    return {
      fieldname: file.fieldname,
      originalname: file.originalname,
      encoding: file.encoding,
      mimetype: file.mimetype,
      size: file.size,
      buffer: Buffer.from(file.bufferBase64, 'base64'),
      stream: undefined as never,
      destination: '',
      filename: '',
      path: '',
    };
  }
}
