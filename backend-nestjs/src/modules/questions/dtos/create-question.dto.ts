import { Difficulty, AnswerChoice } from '@prisma/client';
import {
  ArrayMaxSize,
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreateQuestionDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(5000)
  content!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  optionA!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  optionB!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  optionC!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  optionD!: string;

  @IsEnum(AnswerChoice)
  correctAnswer!: AnswerChoice;

  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  subject!: string;

  @IsEnum(Difficulty)
  difficulty!: Difficulty;

  @IsArray()
  @IsString({ each: true })
  @MaxLength(64, { each: true })
  @ArrayMaxSize(20)
  @IsOptional()
  tags?: string[];
}
