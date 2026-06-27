import {
  IsArray,
  IsEnum,
  IsNumber,
  IsOptional,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { AnswerChoice } from '@prisma/client';

export class SubmissionAnswerPatchDto {
  @IsNumber()
  questionNumber: number;

  @IsOptional()
  @IsEnum(AnswerChoice)
  finalAnswer?: AnswerChoice | null;
}

export class UpdateSubmissionAnswersDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SubmissionAnswerPatchDto)
  answers: SubmissionAnswerPatchDto[];
}
