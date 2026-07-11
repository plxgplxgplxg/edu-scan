import { AnswerChoice } from '@prisma/client';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class UpsertExamQuestionAnswerDto {
  @IsInt()
  @Min(1)
  questionNumber!: number;

  @IsEnum(AnswerChoice)
  correctAnswer!: AnswerChoice;

  @IsString()
  @MaxLength(20)
  @IsOptional()
  testCode?: string;
}

export class RemoveExamQuestionAnswerDto {
  @IsInt()
  @Min(1)
  questionNumber!: number;

  @IsString()
  @MaxLength(20)
  @IsOptional()
  testCode?: string;
}
