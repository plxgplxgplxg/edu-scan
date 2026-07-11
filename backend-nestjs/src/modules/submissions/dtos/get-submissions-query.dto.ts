import { Type } from 'class-transformer';
import { IsOptional, IsString, IsEnum, IsInt, Min } from 'class-validator';
import { SubmissionStatus, TestCodeResolutionStatus } from '@prisma/client';

export enum SortOrder {
  ASC = 'asc',
  DESC = 'desc',
}

export class GetSubmissionsQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 10;

  @IsOptional()
  @IsString()
  keyword?: string;

  @IsOptional()
  @IsEnum(SortOrder)
  sortScore?: SortOrder;

  @IsOptional()
  @IsString()
  variantCode?: string;

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
