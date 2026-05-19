import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { SubmissionStatus } from '@prisma/client';

export class QueryMySubmissionsDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  limit?: number;

  @IsString()
  @IsOptional()
  classId?: string;

  @IsString()
  @IsOptional()
  examId?: string;

  @IsEnum(SubmissionStatus)
  @IsOptional()
  status?: SubmissionStatus;
}
