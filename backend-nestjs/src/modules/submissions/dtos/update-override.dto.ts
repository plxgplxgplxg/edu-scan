import {
  IsOptional,
  IsString,
  IsArray,
  ValidateNested,
  IsEnum,
  IsNumber,
} from 'class-validator';
import { Type } from 'class-transformer';
import { AnswerChoice } from '@prisma/client';

export class OverrideDetailDto {
  @IsNumber()
  questionNumber: number;

  @IsEnum(AnswerChoice)
  finalAnswer: AnswerChoice;
}

export class UpdateSubmissionOverrideDto {
  @IsOptional()
  @IsString()
  studentCode?: string;

  @IsOptional()
  @IsString()
  resolvedTestCode?: string;

  @IsOptional()
  @IsString()
  resolvedVariantId?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OverrideDetailDto)
  details?: OverrideDetailDto[];
}
