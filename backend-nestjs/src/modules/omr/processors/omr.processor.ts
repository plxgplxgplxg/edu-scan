import { Injectable, Logger } from '@nestjs/common';
import { SubmissionStatus, TestCodeResolutionStatus } from '@prisma/client';
import { OmrRepository } from '../repositories/omr.repository';
import {
  PreparedSubmissionDetail,
  GradingService,
} from '../services/grading.service';
import { ImageUploadService } from '../services/image-upload.service';
import { OmrQueueJobData, OmrSerializedFile } from '../queue/omr-queue.types';
import { OMR_TRANSPORT_CLIENT } from '../interfaces/omr-transport.interface';
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
  score: number;
  maxScore: number;
  correctCount: number;
  wrongCount: number;
  reviewCount: number;
  gradedAt: Date;
  needsReview: boolean;
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

  async processJob(
    data: OmrQueueJobData,
    hooks?: {
      onProcessingStart?: (context: {
        batchId: string;
        fileIndex: number;
        totalFiles: number;
      }) => Promise<void> | void;
    },
  ): Promise<ProcessedSubmissionPayload> {
    this.logger.log(
      `processJob start: batchId=${data.batchId} examId=${data.examId} fileIndex=${data.fileIndex}/${data.totalFiles} file=${data.file.originalname} template=${data.templateName ?? 'auto'}`,
    );

    const exam = await this.omrRepository.findExamById(data.examId);
    if (!exam) {
      throw new Error(
        `Exam ${data.examId} not found for batch ${data.batchId}`,
      );
    }
    this.logger.log(
      `exam loaded: id=${exam.id} variants=${exam.variants.length}`,
    );

    const file = this.deserializeFile(data.file);
    this.logger.log(`uploading file: ${file.originalname} size=${file.size}bytes`);
    const imageUrl = await this.imageUploadService.uploadFile(
      file,
      data.batchId,
    );
    this.logger.log(`file uploaded: ${imageUrl}`);
    await hooks?.onProcessingStart?.({
      batchId: data.batchId,
      fileIndex: data.fileIndex,
      totalFiles: data.totalFiles,
    });
    let detectResult;
    try {
      this.logger.log(`Calling OMR gRPC service detectImage: imageUrl=${imageUrl}, templateName=${data.templateName}`);
      detectResult = await this.omrClientService.detectImage({
        imageUrl,
        templateName: data.templateName,
      });
      this.logger.log(`OMR gRPC service call succeeded: studentCode=${detectResult.studentCode}, testId=${detectResult.testId}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const stack = error instanceof Error ? error.stack : undefined;
      this.logger.error(
        `OMR detect failed: batchId=${data.batchId} file=${data.file.originalname} error=${message}${stack ? ' stack=' + stack : ''}`,
      );
      throw error;
    }
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
    const summary = this.gradingService.summarizeSubmission(
      resolvedVariant?.answerKeys ?? null,
      preparedSubmission.details,
      exam.maxScore,
    );

    this.logger.log(
      `grading: variant=${resolvedVariant?.id ?? 'none'} testCodeStatus=${variantResolution.status}`,
    );

    const overlayResult =
      resolvedVariant && detectResult.artifacts?.resultJsonPath
        ? await this.omrClientService.renderGradeOverlay({
            resultJsonPath: detectResult.artifacts.resultJsonPath,
            marks: this.gradingService.buildOverlayMarks(
              preparedSubmission.details,
            ),
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
    const status = preparedSubmission.status;

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
      score: summary.score,
      maxScore: summary.maxScore,
      correctCount: summary.correctCount,
      wrongCount: summary.wrongCount,
      reviewCount: summary.reviewCount,
      gradedAt: summary.gradedAt,
      needsReview: status === SubmissionStatus.NEEDS_REVIEW,
      details: preparedSubmission.details,
      ...artifactUrls,
    };

    this.logger.log(
      `processJob done: batchId=${data.batchId} file=${data.file.originalname} status=${submissionPayload.status} score=${submissionPayload.score} needsReview=${submissionPayload.needsReview}`,
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
