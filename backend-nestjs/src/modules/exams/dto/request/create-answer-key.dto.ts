import { AnswerChoice } from '@prisma/client';
import { IsEnum, IsInt, Min } from 'class-validator';

export class CreateAnswerKeyDto {
  @IsInt()
  @Min(1)
  questionNumber!: number;

  @IsEnum(AnswerChoice)
  correctAnswer!: AnswerChoice;
}
