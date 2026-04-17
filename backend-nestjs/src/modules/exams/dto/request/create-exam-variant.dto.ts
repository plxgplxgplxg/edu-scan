import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsNotEmpty,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { CreateAnswerKeyDto } from './create-answer-key.dto';

export class CreateExamVariantDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  testCode!: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateAnswerKeyDto)
  answerKeys!: CreateAnswerKeyDto[];
}
