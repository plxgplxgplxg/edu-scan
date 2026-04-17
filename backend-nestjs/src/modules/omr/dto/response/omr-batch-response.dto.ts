import {
  OmrBatchStatus,
  SubmissionStatus,
  TestCodeResolutionStatus,
} from '@prisma/client';

export class OmrSubmissionDetailResponseDto {
  questionNumber!: number;
  correctAnswer!: string | null;
  detectedAnswer!: string | null;
  finalAnswer!: string | null;
  isCorrect!: boolean;
  needsReview!: boolean;
  reviewReason!: string | null;
}

export class OmrSubmissionResponseDto {
  id!: string;
  studentId!: string | null;
  studentCode!: string | null;
  studentName!: string | null;
  detectedTestId!: string | null;
  resolvedTestCode!: string | null;
  resolvedVariantId!: string | null;
  testCodeResolutionStatus!: TestCodeResolutionStatus;
  imageUrl!: string | null;
  processedImageUrl!: string | null;
  annotatedImageUrl!: string | null;
  warpOverlayUrl!: string | null;
  answerScoresUrl!: string | null;
  status!: SubmissionStatus;
  score!: number;
  maxScore!: number;
  correctCount!: number;
  wrongCount!: number;
  reviewCount!: number;
  needsReview!: boolean;
  details!: OmrSubmissionDetailResponseDto[];
}

export class OmrSubmissionDetailViewResponseDto extends OmrSubmissionResponseDto {
  examId!: string;
  batchId!: string | null;
  createdAt!: Date;
  updatedAt!: Date;
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
