import { IsEnum, IsOptional } from 'class-validator';
import { AnswerChoice } from '@prisma/client';

export class UpdateSubmissionDetailDto {
  @IsOptional()
  @IsEnum(AnswerChoice)
  finalAnswer?: AnswerChoice | null;
}
