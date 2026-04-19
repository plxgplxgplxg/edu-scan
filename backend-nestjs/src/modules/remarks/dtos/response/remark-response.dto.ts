import { ApiProperty } from '@nestjs/swagger';
import { RemarkStatus } from '@prisma/client';

export class RemarkSubmissionStudentDto {
  @ApiProperty()
  name!: string;

  @ApiProperty({ nullable: true })
  studentCode!: string | null;
}

export class RemarkSubmissionSummaryDto {
  @ApiProperty({ type: RemarkSubmissionStudentDto, nullable: true })
  student!: RemarkSubmissionStudentDto | null;

  @ApiProperty({ type: Object })
  exam!: { title: string };
}

export class RemarkSubmissionDetailDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  submissionId!: string;

  @ApiProperty()
  questionNumber!: number;

  @ApiProperty({ nullable: true })
  detectedAnswer!: string | null;

  @ApiProperty({ nullable: true })
  finalAnswer!: string | null;

  @ApiProperty()
  needsReview!: boolean;

  @ApiProperty({ nullable: true })
  reviewReason!: string | null;

  @ApiProperty({ type: RemarkSubmissionSummaryDto, required: false })
  submission?: RemarkSubmissionSummaryDto;
}

export class RemarkResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  submissionDetailId!: string;

  @ApiProperty({ format: 'uuid' })
  studentId!: string;

  @ApiProperty({ format: 'uuid', nullable: true })
  reviewerId!: string | null;

  @ApiProperty()
  reason!: string;

  @ApiProperty({ enum: RemarkStatus, enumName: 'RemarkStatus' })
  status!: RemarkStatus;

  @ApiProperty({ nullable: true })
  teacherComment!: string | null;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt!: Date;

  @ApiProperty({ type: String, format: 'date-time' })
  updatedAt!: Date;

  @ApiProperty({ type: String, format: 'date-time', nullable: true })
  reviewedAt!: Date | null;

  @ApiProperty({ type: RemarkSubmissionDetailDto, required: false })
  submissionDetail?: RemarkSubmissionDetailDto;
}
