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
  OmrSubmissionListItemResponseDto,
  OmrSubmissionDetailViewResponseDto,
  OmrSubmissionResponseDto,
} from '../dto/response/omr-batch-response.dto';
import { GradingService, PreparedSubmissionDetail } from './grading.service';
import {
  OmrBatchHeader,
  OmrBatchLightweight,
  OmrBatchWithRelations,
  OmrRepository,
  OmrSubmissionWithRelations,
  OmrSubmissionListItem,
} from '../repositories/omr.repository';
import { buildOmrSseChannelId, OmrSseEvent } from '../sse/omr-sse-event';
import { SseRegistryService } from './sse-registry.service';

const SUBMISSION_PAGE_SIZE = 20;

@Injectable()
export class BatchService {
  constructor(
    private readonly omrRepository: OmrRepository,
    private readonly gradingService: GradingService,
    private readonly eventEmitter: EventEmitter2,
    private readonly sseRegistryService: SseRegistryService<OmrSseEvent>,
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
    await this.assertTeacherBatchAccess(batchId, teacherId);

    const teacherBatch = await this.omrRepository.findTeacherBatchById(
      batchId,
      teacherId,
    );

    if (!teacherBatch) {
      throw new NotFoundException('OMR batch not found');
    }

    return this.toBatchResponseDto(teacherBatch);
  }

  async getTeacherBatchHeader(batchId: string, teacherId: string) {
    await this.assertTeacherBatchAccess(batchId, teacherId);

    const batch = await this.omrRepository.findTeacherBatchHeader(
      batchId,
      teacherId,
    );

    if (!batch) {
      throw new NotFoundException('OMR batch not found');
    }

    const [matchedCount, unmatchedCount] = await Promise.all([
      this.omrRepository.countBatchSubmissionsByStudentMatched(batchId, true),
      this.omrRepository.countBatchSubmissionsByStudentMatched(batchId, false),
      this.omrRepository.countBatchSubmissions(batchId),
    ]);

    return this.toBatchHeaderResponseDto(batch, matchedCount, unmatchedCount);
  }

  async getTeacherBatchSubmissions(
    batchId: string,
    teacherId: string,
    page: number,
    limit: number,
    status?: SubmissionStatus,
  ) {
    await this.assertTeacherBatchAccess(batchId, teacherId);

    const safeLimit = Math.min(limit, SUBMISSION_PAGE_SIZE);
    const { items, total } =
      await this.omrRepository.findBatchSubmissionsPaginated(
        batchId,
        page,
        safeLimit,
        status,
      );

    return {
      items: items.map((submission) =>
        this.toSubmissionListItemResponseDto(submission),
      ),
      total,
      page,
      limit: safeLimit,
      totalPages: total === 0 ? 0 : Math.ceil(total / safeLimit),
    };
  }

  async assertTeacherBatchAccess(batchId: string, teacherId: string) {
    const batch = await this.omrRepository.findBatchAccessById(batchId);

    if (!batch) {
      throw new NotFoundException('OMR batch not found');
    }

    if (batch.teacherId !== teacherId) {
      throw new ForbiddenException('You do not have access to this OMR batch');
    }

    return batch;
  }

  async listTeacherBatches(teacherId: string): Promise<OmrBatchResponseDto[]> {
    const batches = await this.omrRepository.listTeacherBatches(teacherId);
    return batches.map((batch) => this.toBatchListResponseDto(batch));
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

  async regradeSubmission(
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

    const answerKeys = submission.resolvedVariant?.answerKeys ?? null;
    const preparedDetails = submission.details.map((d) => ({
      questionNumber: d.questionNumber,
      detectedAnswer: d.detectedAnswer,
      finalAnswer: d.finalAnswer,
      needsReview: d.needsReview,
      reviewReason: d.reviewReason,
      correctAnswer: d.correctAnswer,
      isCorrect: d.isCorrect ?? false,
    }));
    const summary = this.gradingService.summarizeSubmission(
      answerKeys,
      preparedDetails,
      submission.exam.maxScore,
    );

    const details = submission.details.map((detail) => {
      const answerKey = answerKeys?.find(
        (k) => k.questionNumber === detail.questionNumber,
      );
      const isCorrect =
        answerKey !== undefined &&
        !detail.needsReview &&
        detail.finalAnswer !== null &&
        detail.finalAnswer === answerKey.correctAnswer;

      return {
        id: detail.id,
        correctAnswer: answerKey?.correctAnswer ?? null,
        isCorrect,
      };
    });

    const needsReview = submission.details.some((d) => d.needsReview);
    const status = needsReview
      ? SubmissionStatus.NEEDS_REVIEW
      : SubmissionStatus.GRADED;

    await this.omrRepository.updateSubmissionScores({
      submissionId,
      score: summary.score,
      maxScore: summary.maxScore,
      correctCount: summary.correctCount,
      wrongCount: summary.wrongCount,
      reviewCount: summary.reviewCount,
      gradedAt: summary.gradedAt,
      status,
      details,
    });

    const updatedSubmission =
      await this.omrRepository.findTeacherSubmissionById(
        submissionId,
        teacherId,
      );

    if (!updatedSubmission) {
      throw new NotFoundException('Submission not found after regrade');
    }

    return this.toSubmissionDetailResponseDto(updatedSubmission);
  }

  private toBatchResponseDto(
    batch: OmrBatchWithRelations,
  ): OmrBatchResponseDto {
    return {
      id: batch.id,
      examId: batch.examId,
      examTitle: batch.exam.title,
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
      matchedCount: batch.submissions.filter((item) => !!item.studentId).length,
      unmatchedCount: batch.submissions.filter((item) => !item.studentId)
        .length,
    };
  }

  private toBatchHeaderResponseDto(
    batch: OmrBatchHeader,
    matchedCount: number,
    unmatchedCount: number,
  ): OmrBatchResponseDto {
    return {
      id: batch.id,
      examId: batch.examId,
      examTitle: batch.exam.title,
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
      submissions: [],
      matchedCount,
      unmatchedCount,
    };
  }

  private toBatchListResponseDto(
    batch: OmrBatchLightweight,
  ): OmrBatchResponseDto {
    return {
      id: batch.id,
      examId: batch.examId,
      examTitle: batch.exam.title,
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
      submissions: [],
      matchedCount: batch.submissions.filter((item) => !!item.studentId).length,
      unmatchedCount: batch.submissions.filter((item) => !item.studentId)
        .length,
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

  private toSubmissionListItemResponseDto(
    submission: OmrSubmissionListItem,
  ): OmrSubmissionListItemResponseDto {
    return {
      id: submission.id,
      studentId: submission.studentId,
      studentCode: submission.studentCode,
      studentName: submission.student?.name ?? null,
      detectedTestId: submission.detectedTestId,
      resolvedTestCode: submission.resolvedTestCode,
      status: submission.status,
      score: submission.score ?? 0,
      maxScore: submission.maxScore ?? 0,
      correctCount: submission.correctCount ?? 0,
      wrongCount: submission.wrongCount ?? 0,
      reviewCount: submission.reviewCount ?? 0,
      needsReview: submission.status === SubmissionStatus.NEEDS_REVIEW,
      questionCount: submission._count.details,
    };
  }

  private toSubmissionResponseDto(
    submission: OmrSubmissionWithRelations,
  ): OmrSubmissionResponseDto {
    const details = this.mapSubmissionDetails(
      submission.details,
      submission.testCodeResolutionStatus,
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
      score: submission.score ?? 0,
      maxScore: submission.maxScore ?? submission.exam.maxScore,
      correctCount: submission.correctCount ?? 0,
      wrongCount: submission.wrongCount ?? 0,
      reviewCount: submission.reviewCount ?? 0,
      needsReview: submission.status === SubmissionStatus.NEEDS_REVIEW,
      details,
    };
  }

  private mapSubmissionDetails(
    details: Array<{
      questionNumber: number;
      detectedAnswer: string | null;
      finalAnswer: string | null;
      needsReview: boolean;
      reviewReason: string | null;
      correctAnswer: string | null;
      isCorrect: boolean | null;
    }>,
    testCodeResolutionStatus: TestCodeResolutionStatus,
  ) {
    return details.map((detail) => {
      const reviewReason =
        detail.reviewReason ??
        (testCodeResolutionStatus === TestCodeResolutionStatus.MATCHED
          ? null
          : testCodeResolutionStatus);

      return {
        questionNumber: detail.questionNumber,
        correctAnswer: detail.correctAnswer,
        detectedAnswer: detail.detectedAnswer,
        finalAnswer: detail.finalAnswer,
        isCorrect: detail.isCorrect ?? false,
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

      this.sseRegistryService.emit(buildOmrSseChannelId(batch.id), {
        type: 'batch:completed',
        batchId: batch.id,
        status: batch.status,
        processedFiles: batch.processedFiles,
        totalFiles: batch.totalFiles,
        pct: 100,
      });
      this.sseRegistryService.complete(buildOmrSseChannelId(batch.id));
    }
  }
}
