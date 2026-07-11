import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { CreateAnswerKeyDto } from './create-answer-key.dto';
import { CreateExamVariantDto } from './create-exam-variant.dto';

export class CreateExamDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  title!: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  maxScore!: number;

  @IsNumber()
  @Min(1)
  @IsOptional()
  questionCount?: number;

  @IsArray()
  @IsUUID('4', { each: true })
  @IsOptional()
  classIds?: string[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateAnswerKeyDto)
  @IsOptional()
  answerKeys?: CreateAnswerKeyDto[];

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateExamVariantDto)
  @IsOptional()
  variants?: CreateExamVariantDto[];
}
