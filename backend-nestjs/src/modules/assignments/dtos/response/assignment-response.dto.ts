import { ApiProperty } from '@nestjs/swagger';
import { GradeStatus, SubmitStatus } from '@prisma/client';

export class AssignmentTeacherSummaryDto {
  @ApiProperty({ type: Number, example: 12 })
  submits!: number;
}

export class AssignmentStudentSubmitSummaryDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ enum: SubmitStatus, enumName: 'SubmitStatus' })
  submitStatus!: SubmitStatus;

  @ApiProperty({ enum: GradeStatus, enumName: 'GradeStatus' })
  gradeStatus!: GradeStatus;

  @ApiProperty({ nullable: true })
  score!: number | null;
}

export class AssignmentResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  title!: string;

  @ApiProperty({ nullable: true })
  description!: string | null;

  @ApiProperty({ type: String, format: 'date-time' })
  deadline!: Date;

  @ApiProperty()
  allowLate!: boolean;

  @ApiProperty()
  latePenaltyPct!: number;

  @ApiProperty()
  maxScore!: number;

  @ApiProperty({ format: 'uuid' })
  teacherId!: string;

  @ApiProperty({ format: 'uuid' })
  classId!: string;

  @ApiProperty({ required: false, nullable: true })
  className?: string | null;

  @ApiProperty({ type: AssignmentTeacherSummaryDto, required: false })
  _count?: AssignmentTeacherSummaryDto;

  @ApiProperty({ type: [AssignmentStudentSubmitSummaryDto], required: false })
  submits?: AssignmentStudentSubmitSummaryDto[];

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt!: Date;

  @ApiProperty({ type: String, format: 'date-time' })
  updatedAt!: Date;
}

export class AssignmentSubmitStudentDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty({ example: 'student@example.com' })
  email!: string;

  @ApiProperty({ nullable: true })
  studentCode!: string | null;
}

export class AssignmentSubmitResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  assignmentId!: string;

  @ApiProperty({ format: 'uuid' })
  studentId!: string;

  @ApiProperty()
  fileUrl!: string;

  @ApiProperty({ enum: SubmitStatus, enumName: 'SubmitStatus' })
  submitStatus!: SubmitStatus;

  @ApiProperty({ enum: GradeStatus, enumName: 'GradeStatus' })
  gradeStatus!: GradeStatus;

  @ApiProperty({ nullable: true })
  score!: number | null;

  @ApiProperty({ nullable: true })
  feedback!: string | null;

  @ApiProperty({ type: String, format: 'date-time' })
  submittedAt!: Date;

  @ApiProperty({ type: String, format: 'date-time' })
  updatedAt!: Date;

  @ApiProperty({ type: AssignmentSubmitStudentDto, required: false })
  student?: AssignmentSubmitStudentDto;
}
