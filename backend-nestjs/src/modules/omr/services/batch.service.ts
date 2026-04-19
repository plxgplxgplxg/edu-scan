import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  OmrBatchStatus,
  SubmissionStatus,
  TestCodeResolutionStatus,
} from '@prisma/client';
import {
  OmrBatchResponseDto,
  OmrSubmissionDetailViewResponseDto,
  OmrSubmissionResponseDto,
} from '../dto/response/omr-batch-response.dto';
import { PreparedSubmissionDetail, GradingService } from './grading.service';
import {
  OmrBatchWithRelations,
  OmrRepository,
  OmrSubmissionWithRelations,
} from '../repositories/omr.repository';

@Injectable()
export class BatchService {
  constructor(
    private readonly omrRepository: OmrRepository,
    private readonly gradingService: GradingService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async createBatch(examId: string, teacherId: string, totalFiles: number) {
    return this.omrRepository.createBatch({
      examId,
      teacherId,
      totalFiles,
    });
  }

  async markProcessing(batchId: string) {
    return this.omrRepository.markBatchStatus(
      batchId,
      OmrBatchStatus.PROCESSING,
    );
  }

  async recordSuccessfulFile(data: {
    batchId: string;
    examId: string;
    resolvedVariantId: string | null;
    imageUrl: string;
    studentId: string | null;
    studentCode: string | null;
    detectedTestId: string | null;
    resolvedTestCode: string | null;
    testCodeResolutionStatus: TestCodeResolutionStatus;
    status: SubmissionStatus;
    details: PreparedSubmissionDetail[];
    processedImageUrl?: string | null;
    annotatedImageUrl?: string | null;
    warpOverlayUrl?: string | null;
    answerScoresUrl?: string | null;
  }) {
    const batch = await this.omrRepository.recordSuccessfulFile(data);
    this.emitBatchCompletionIfFinal(batch);
    return batch;
  }

  async recordFailedFile(batchId: string) {
    const batch = await this.omrRepository.recordFailedFile(batchId);
    this.emitBatchCompletionIfFinal(batch);
    return batch;
  }

  async getTeacherBatchById(
    batchId: string,
    teacherId: string,
  ): Promise<OmrBatchResponseDto> {
    const batch = await this.omrRepository.findBatchById(batchId);

    if (!batch) {
      throw new NotFoundException('OMR batch not found');
    }

    if (batch.teacherId !== teacherId) {
      throw new ForbiddenException('You do not have access to this OMR batch');
    }

    const teacherBatch = await this.omrRepository.findTeacherBatchById(
      batchId,
      teacherId,
    );

    if (!teacherBatch) {
      throw new NotFoundException('OMR batch not found');
    }

    return this.toBatchResponseDto(teacherBatch);
  }

  async getTeacherSubmissionById(
    submissionId: string,
    teacherId: string,
  ): Promise<OmrSubmissionDetailViewResponseDto> {
    const submission = await this.omrRepository.findTeacherSubmissionById(
      submissionId,
      teacherId,
    );

    if (!submission) {
      throw new NotFoundException('Submission not found');
    }

    return this.toSubmissionDetailResponseDto(submission);
  }

  private toBatchResponseDto(
    batch: OmrBatchWithRelations,
  ): OmrBatchResponseDto {
    return {
      id: batch.id,
      examId: batch.examId,
      teacherId: batch.teacherId,
      status: batch.status,
      totalFiles: batch.totalFiles,
      processedFiles: batch.processedFiles,
      successCount: batch.successCount,
      failedCount: batch.failedCount,
      progressPercentage:
        batch.totalFiles === 0
          ? 0
          : Math.round((batch.processedFiles / batch.totalFiles) * 100),
      completedAt: batch.completedAt,
      createdAt: batch.createdAt,
      updatedAt: batch.updatedAt,
      submissions: batch.submissions.map((submission) =>
        this.toSubmissionResponseDto({
          ...submission,
          exam: batch.exam,
        } as OmrSubmissionWithRelations),
      ),
    };
  }

  private toSubmissionDetailResponseDto(
    submission: OmrSubmissionWithRelations,
  ): OmrSubmissionDetailViewResponseDto {
    const base = this.toSubmissionResponseDto(submission);

    return {
      ...base,
      examId: submission.examId,
      batchId: submission.batchId,
      createdAt: submission.createdAt,
      updatedAt: submission.updatedAt,
    };
  }

  private toSubmissionResponseDto(
    submission: OmrSubmissionWithRelations,
  ): OmrSubmissionResponseDto {
    const answerKeys = submission.resolvedVariant?.answerKeys ?? null;
    const details = this.mapSubmissionDetails(
      answerKeys,
      submission.details,
      submission.testCodeResolutionStatus,
    );
    const summary = this.gradingService.summarizeSubmission(
      answerKeys,
      submission.details,
      submission.exam.maxScore,
    );

    return {
      id: submission.id,
      studentId: submission.studentId,
      studentCode: submission.studentCode,
      studentName: submission.student?.name ?? null,
      detectedTestId: submission.detectedTestId,
      resolvedTestCode: submission.resolvedTestCode,
      resolvedVariantId: submission.resolvedVariantId,
      testCodeResolutionStatus: submission.testCodeResolutionStatus,
      imageUrl: submission.imageUrl,
      processedImageUrl: submission.processedImageUrl,
      annotatedImageUrl: submission.annotatedImageUrl,
      warpOverlayUrl: submission.warpOverlayUrl,
      answerScoresUrl: submission.answerScoresUrl,
      status: submission.status,
      score: summary.score,
      maxScore: summary.maxScore,
      correctCount: summary.correctCount,
      wrongCount: summary.wrongCount,
      reviewCount: summary.reviewCount,
      needsReview: submission.status === SubmissionStatus.NEEDS_REVIEW,
      details,
    };
  }

  private mapSubmissionDetails(
    answerKeys: Array<{
      questionNumber: number;
      correctAnswer: string | null;
    }> | null,
    details: Array<{
      questionNumber: number;
      detectedAnswer: string | null;
      finalAnswer: string | null;
      needsReview: boolean;
      reviewReason: string | null;
    }>,
    testCodeResolutionStatus: TestCodeResolutionStatus,
  ) {
    const answerKeyMap = new Map(
      (answerKeys ?? []).map((item) => [
        item.questionNumber,
        item.correctAnswer,
      ]),
    );

    return details.map((detail) => {
      const correctAnswer = answerKeyMap.get(detail.questionNumber) ?? null;
      const reviewReason =
        detail.reviewReason ??
        (testCodeResolutionStatus === TestCodeResolutionStatus.MATCHED
          ? null
          : testCodeResolutionStatus);

      return {
        questionNumber: detail.questionNumber,
        correctAnswer,
        detectedAnswer: detail.detectedAnswer,
        finalAnswer: detail.finalAnswer,
        isCorrect:
          correctAnswer !== null &&
          !detail.needsReview &&
          detail.finalAnswer !== null &&
          detail.finalAnswer === correctAnswer,
        needsReview: detail.needsReview,
        reviewReason,
      };
    });
  }

  private emitBatchCompletionIfFinal(batch: {
    id?: string;
    status?: OmrBatchStatus;
    processedFiles?: number;
    totalFiles?: number;
  }) {
    if (
      !batch?.id ||
      batch.processedFiles === undefined ||
      batch.totalFiles === undefined ||
      batch.processedFiles < batch.totalFiles
    ) {
      return;
    }

    if (
      batch.status === OmrBatchStatus.COMPLETED ||
      batch.status === OmrBatchStatus.PARTIAL_FAILED ||
      batch.status === OmrBatchStatus.FAILED
    ) {
      this.eventEmitter.emit('omr.batch.completed', {
        batchId: batch.id,
        status: batch.status,
      });
    }
  }
}
