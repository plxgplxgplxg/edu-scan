import { IsInt, IsOptional, IsUUID, Min } from 'class-validator';

export class MapExamQuestionDto {
  @IsInt()
  @Min(1)
  questionNumber!: number;

  @IsUUID()
  @IsOptional()
  questionId?: string;
}
