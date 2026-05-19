import { IsOptional, IsString, IsEnum } from 'class-validator';
import { SubmissionStatus, TestCodeResolutionStatus } from '@prisma/client';

export class GetSubmissionsQueryDto {
  @IsOptional()
  @IsString()
  examId?: string;

  @IsOptional()
  @IsString()
  classId?: string;

  @IsOptional()
  @IsString()
  batchId?: string;

  @IsOptional()
  @IsString()
  studentId?: string;

  @IsOptional()
  @IsEnum(SubmissionStatus)
  status?: SubmissionStatus;

  @IsOptional()
  @IsEnum(TestCodeResolutionStatus)
  testCodeResolutionStatus?: TestCodeResolutionStatus;
}
