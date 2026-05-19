import { SubmissionStatus, TestCodeResolutionStatus } from '@prisma/client';
import { Injectable } from '@nestjs/common';
import { PreparedSubmissionDetail } from './grading.service';
import { BatchService } from './batch.service';

@Injectable()
export class OmrBatchStateUpdaterService {
  constructor(private readonly batchService: BatchService) {}

  async markProcessing(batchId: string) {
    return this.batchService.markProcessing(batchId);
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
    details: PreparedSubmissionDetail[];
    processedImageUrl?: string | null;
    annotatedImageUrl?: string | null;
    warpOverlayUrl?: string | null;
    answerScoresUrl?: string | null;
  }) {
    return this.batchService.recordSuccessfulFile(data);
  }

  async recordFailedFile(batchId: string) {
    return this.batchService.recordFailedFile(batchId);
  }
}
