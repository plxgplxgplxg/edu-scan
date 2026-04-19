import { ApiProperty } from '@nestjs/swagger';
import {
  AnswerChoice,
  OmrBatchStatus,
  SubmissionStatus,
  TestCodeResolutionStatus,
} from '@prisma/client';

export class SubmissionStudentSummaryDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty({ nullable: true })
  studentCode!: string | null;
}

export class SubmissionBatchSummaryDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ enum: OmrBatchStatus, enumName: 'OmrBatchStatus' })
  status!: OmrBatchStatus;
}

export class SubmissionExamSummaryDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  title!: string;

  @ApiProperty()
  maxScore!: number;
}

export class SubmissionListItemResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  examId!: string;

  @ApiProperty({ format: 'uuid', nullable: true })
  resolvedVariantId!: string | null;

  @ApiProperty({ format: 'uuid', nullable: true })
  studentId!: string | null;

  @ApiProperty({ format: 'uuid', nullable: true })
  batchId!: string | null;

  @ApiProperty({ nullable: true })
  studentCode!: string | null;

  @ApiProperty({ nullable: true })
  detectedTestId!: string | null;

  @ApiProperty({ nullable: true })
  resolvedTestCode!: string | null;

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

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt!: Date;

  @ApiProperty({ type: String, format: 'date-time' })
  updatedAt!: Date;

  @ApiProperty({ type: String, format: 'date-time', nullable: true })
  reviewedAt!: Date | null;

  @ApiProperty({ type: SubmissionStudentSummaryDto, nullable: true })
  student!: SubmissionStudentSummaryDto | null;

  @ApiProperty({ type: SubmissionBatchSummaryDto, nullable: true })
  batch!: SubmissionBatchSummaryDto | null;

  @ApiProperty({ type: SubmissionExamSummaryDto })
  exam!: SubmissionExamSummaryDto;
}

export class SubmissionDetailItemResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  submissionId!: string;

  @ApiProperty()
  questionNumber!: number;

  @ApiProperty({ nullable: true })
  detectedAnswer!: string | null;

  @ApiProperty({ enum: AnswerChoice, enumName: 'AnswerChoice', nullable: true })
  finalAnswer!: AnswerChoice | null;

  @ApiProperty()
  needsReview!: boolean;

  @ApiProperty({ nullable: true })
  reviewReason!: string | null;

  @ApiProperty({ enum: AnswerChoice, enumName: 'AnswerChoice', nullable: true })
  correctAnswer!: AnswerChoice | null;

  @ApiProperty()
  isCorrect!: boolean;
}

export class SubmissionScoreSummaryDto {
  @ApiProperty()
  totalCorrect!: number;

  @ApiProperty()
  maxScore!: number;

  @ApiProperty()
  calculatedScore!: number;
}

export class SubmissionDetailResponseDto extends SubmissionListItemResponseDto {
  @ApiProperty({ type: [SubmissionDetailItemResponseDto] })
  details!: SubmissionDetailItemResponseDto[];

  @ApiProperty({ type: SubmissionScoreSummaryDto })
  score!: SubmissionScoreSummaryDto;
}

export class StudentSubmissionItemResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  examId!: string;

  @ApiProperty()
  examTitle!: string;

  @ApiProperty({ enum: SubmissionStatus, enumName: 'SubmissionStatus' })
  status!: SubmissionStatus;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt!: Date;

  @ApiProperty({ type: String, format: 'date-time', nullable: true })
  reviewedAt!: Date | null;

  @ApiProperty()
  score!: number;

  @ApiProperty()
  maxScore!: number;

  @ApiProperty()
  totalCorrect!: number;

  @ApiProperty()
  totalQuestions!: number;

  @ApiProperty()
  needsReview!: boolean;

  @ApiProperty({ nullable: true })
  reviewNote!: string | null;
}

export class StudentSubmissionListResponseDto {
  @ApiProperty({ type: [StudentSubmissionItemResponseDto] })
  items!: StudentSubmissionItemResponseDto[];

  @ApiProperty()
  total!: number;

  @ApiProperty()
  page!: number;

  @ApiProperty()
  limit!: number;

  @ApiProperty()
  totalPages!: number;
}

export class StudentSubmissionProgressItemResponseDto {
  @ApiProperty({ type: String, format: 'date-time' })
  date!: string;

  @ApiProperty()
  score!: number;

  @ApiProperty()
  maxScore!: number;

  @ApiProperty({ format: 'uuid' })
  examId!: string;

  @ApiProperty()
  examTitle!: string;

  @ApiProperty({ format: 'uuid' })
  submissionId!: string;

  @ApiProperty({ enum: SubmissionStatus, enumName: 'SubmissionStatus' })
  status!: SubmissionStatus;

  @ApiProperty()
  needsReview!: boolean;

  @ApiProperty({ nullable: true })
  reviewNote!: string | null;
}
