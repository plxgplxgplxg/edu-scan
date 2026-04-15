import { OmrBatchStatus, SubmissionStatus } from '@prisma/client';

export class OmrSubmissionDetailResponseDto {
  questionNumber!: number;
  detectedAnswer!: string | null;
  finalAnswer!: string | null;
  needsReview!: boolean;
}

export class OmrSubmissionResponseDto {
  id!: string;
  studentId!: string | null;
  studentCode!: string | null;
  studentName!: string | null;
  imageUrl!: string | null;
  status!: SubmissionStatus;
  score!: number;
  maxScore!: number;
  needsReview!: boolean;
  details!: OmrSubmissionDetailResponseDto[];
}

export class OmrBatchResponseDto {
  id!: string;
  examId!: string;
  teacherId!: string;
  status!: OmrBatchStatus;
  totalFiles!: number;
  processedFiles!: number;
  successCount!: number;
  failedCount!: number;
  progressPercentage!: number;
  completedAt!: Date | null;
  createdAt!: Date;
  updatedAt!: Date;
  submissions!: OmrSubmissionResponseDto[];
}
