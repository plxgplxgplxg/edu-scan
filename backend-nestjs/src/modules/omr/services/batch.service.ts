import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { OmrBatchStatus, SubmissionStatus } from '@prisma/client';
import {
  OmrBatchResponseDto,
  OmrSubmissionResponseDto,
} from '../dto/response/omr-batch-response.dto';
import { PreparedSubmissionDetail, GradingService } from './grading.service';
import {
  OmrBatchWithRelations,
  OmrRepository,
} from '../repositories/omr.repository';

@Injectable()
export class BatchService {
  constructor(
    private readonly omrRepository: OmrRepository,
    private readonly gradingService: GradingService,
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
    imageUrl: string;
    studentId: string | null;
    studentCode: string | null;
    status: SubmissionStatus;
    details: PreparedSubmissionDetail[];
  }) {
    return this.omrRepository.recordSuccessfulFile(data);
  }

  async recordFailedFile(batchId: string) {
    return this.omrRepository.recordFailedFile(batchId);
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
      submissions: batch.submissions.map((submission) => {
        const details = submission.details.map((detail) => ({
          questionNumber: detail.questionNumber,
          detectedAnswer: detail.detectedAnswer,
          finalAnswer: detail.finalAnswer,
          needsReview: detail.needsReview,
        }));

        const score = this.gradingService.calculateScore(
          batch.exam.answerKeys,
          details,
          batch.exam.maxScore,
        );

        return {
          id: submission.id,
          studentId: submission.studentId,
          studentCode: submission.studentCode,
          studentName: submission.student?.name ?? null,
          imageUrl: submission.imageUrl,
          status: submission.status,
          score,
          maxScore: batch.exam.maxScore,
          needsReview: submission.status === SubmissionStatus.NEEDS_REVIEW,
          details,
        } satisfies OmrSubmissionResponseDto;
      }),
    };
  }
}
