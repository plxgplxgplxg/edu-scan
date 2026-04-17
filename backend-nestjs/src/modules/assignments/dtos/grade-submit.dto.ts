import { IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class GradeSubmitDto {
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  score: number;

  @IsOptional()
  @IsString()
  feedback?: string;
}
