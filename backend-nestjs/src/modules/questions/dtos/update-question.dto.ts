import { Difficulty, AnswerChoice } from '@prisma/client';
import {
  ArrayMaxSize,
  IsArray,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class UpdateQuestionDto {
  @IsString()
  @MaxLength(5000)
  @IsOptional()
  content?: string;

  @IsString()
  @MaxLength(500)
  @IsOptional()
  optionA?: string;

  @IsString()
  @MaxLength(500)
  @IsOptional()
  optionB?: string;

  @IsString()
  @MaxLength(500)
  @IsOptional()
  optionC?: string;

  @IsString()
  @MaxLength(500)
  @IsOptional()
  optionD?: string;

  @IsEnum(AnswerChoice)
  @IsOptional()
  correctAnswer?: AnswerChoice;

  @IsString()
  @MaxLength(120)
  @IsOptional()
  subject?: string;

  @IsEnum(Difficulty)
  @IsOptional()
  difficulty?: Difficulty;

  @IsArray()
  @IsString({ each: true })
  @MaxLength(64, { each: true })
  @ArrayMaxSize(20)
  @IsOptional()
  tags?: string[];
}
