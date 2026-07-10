import { ApiProperty } from '@nestjs/swagger';
import {
  OmrBatchStatus,
  SubmissionStatus,
  TestCodeResolutionStatus,
} from '@prisma/client';

export class OmrSubmissionDetailResponseDto {
  @ApiProperty()
  questionNumber!: number;

  @ApiProperty({ nullable: true })
  correctAnswer!: string | null;

  @ApiProperty({ nullable: true })
  detectedAnswer!: string | null;

  @ApiProperty({ nullable: true })
  finalAnswer!: string | null;

  @ApiProperty()
  isCorrect!: boolean;

  @ApiProperty()
  needsReview!: boolean;

  @ApiProperty({ nullable: true })
  reviewReason!: string | null;
}

export class OmrSubmissionResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid', nullable: true })
  studentId!: string | null;

  @ApiProperty({ nullable: true })
  studentCode!: string | null;

  @ApiProperty({ nullable: true })
  studentName!: string | null;

  @ApiProperty({ nullable: true })
  detectedTestId!: string | null;

  @ApiProperty({ nullable: true })
  resolvedTestCode!: string | null;

  @ApiProperty({ format: 'uuid', nullable: true })
  resolvedVariantId!: string | null;

  @ApiProperty({
    enum: TestCodeResolutionStatus,
    enumName: 'TestCodeResolutionStatus',
  })
  testCodeResolutionStatus!: TestCodeResolutionStatus;

  @ApiProperty({ nullable: true })
  imageUrl!: string | null;

  @ApiProperty({ nullable: true })
  processedImageUrl!: string | null;

  @ApiProperty({ nullable: true })
  annotatedImageUrl!: string | null;

  @ApiProperty({ nullable: true })
  warpOverlayUrl!: string | null;

  @ApiProperty({ nullable: true })
  answerScoresUrl!: string | null;

  @ApiProperty({ enum: SubmissionStatus, enumName: 'SubmissionStatus' })
  status!: SubmissionStatus;

  @ApiProperty()
  score!: number;

  @ApiProperty()
  maxScore!: number;

  @ApiProperty()
  correctCount!: number;

  @ApiProperty()
  wrongCount!: number;

  @ApiProperty()
  reviewCount!: number;

  @ApiProperty()
  needsReview!: boolean;

  @ApiProperty({ type: [OmrSubmissionDetailResponseDto] })
  details!: OmrSubmissionDetailResponseDto[];
}

export class OmrSubmissionListItemResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid', nullable: true })
  studentId!: string | null;

  @ApiProperty({ nullable: true })
  studentCode!: string | null;

  @ApiProperty({ nullable: true })
  studentName!: string | null;

  @ApiProperty({ nullable: true })
  detectedTestId!: string | null;

  @ApiProperty({ nullable: true })
  resolvedTestCode!: string | null;

  @ApiProperty({ enum: SubmissionStatus, enumName: 'SubmissionStatus' })
  status!: SubmissionStatus;

  @ApiProperty()
  score!: number;

  @ApiProperty()
  maxScore!: number;

  @ApiProperty()
  correctCount!: number;

  @ApiProperty()
  wrongCount!: number;

  @ApiProperty()
  reviewCount!: number;

  @ApiProperty()
  needsReview!: boolean;

  @ApiProperty({ description: 'Số câu có trong bài làm, không tải chi tiết đáp án.' })
  questionCount!: number;
}

export class OmrSubmissionDetailViewResponseDto extends OmrSubmissionResponseDto {
  @ApiProperty({ format: 'uuid' })
  examId!: string;

  @ApiProperty({ format: 'uuid', nullable: true })
  batchId!: string | null;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt!: Date;

  @ApiProperty({ type: String, format: 'date-time' })
  updatedAt!: Date;
}

export class OmrBatchResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  examId!: string;

  @ApiProperty()
  examTitle!: string;

  @ApiProperty({ format: 'uuid' })
  teacherId!: string;

  @ApiProperty({ enum: OmrBatchStatus, enumName: 'OmrBatchStatus' })
  status!: OmrBatchStatus;

  @ApiProperty()
  totalFiles!: number;

  @ApiProperty()
  processedFiles!: number;

  @ApiProperty()
  successCount!: number;

  @ApiProperty()
  failedCount!: number;

  @ApiProperty()
  progressPercentage!: number;

  @ApiProperty({ type: String, format: 'date-time', nullable: true })
  completedAt!: Date | null;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt!: Date;

  @ApiProperty({ type: String, format: 'date-time' })
  updatedAt!: Date;

  @ApiProperty({ type: [OmrSubmissionResponseDto] })
  submissions!: OmrSubmissionResponseDto[];

  @ApiProperty()
  matchedCount!: number;

  @ApiProperty()
  unmatchedCount!: number;
}
