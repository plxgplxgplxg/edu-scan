import { AnswerChoice, QuestionType } from '@prisma/client';
import {
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class UpsertClassExamQuestionDto {
  @IsInt()
  @Min(1)
  orderIndex!: number;

  @IsEnum(QuestionType)
  type!: QuestionType;

  @IsString()
  @MaxLength(5000)
  content!: string;

  @IsString()
  @IsOptional()
  optionA?: string;

  @IsString()
  @IsOptional()
  optionB?: string;

  @IsString()
  @IsOptional()
  optionC?: string;

  @IsString()
  @IsOptional()
  optionD?: string;

  @IsEnum(AnswerChoice)
  @IsOptional()
  answerChoice?: AnswerChoice;

  @IsString()
  @IsOptional()
  answerText?: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  maxScore!: number;
}
