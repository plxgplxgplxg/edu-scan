import { Transform, Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { Difficulty } from '@prisma/client';

export enum QuestionSortBy {
  CREATED_AT = 'createdAt',
  UPDATED_AT = 'updatedAt',
  SUBJECT = 'subject',
  DIFFICULTY = 'difficulty',
}

export enum SortOrder {
  ASC = 'asc',
  DESC = 'desc',
}

export class QueryQuestionsDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  limit?: number;

  @IsString()
  @MaxLength(120)
  @IsOptional()
  subject?: string;

  @IsEnum(Difficulty)
  @IsOptional()
  difficulty?: Difficulty;

  @Transform(({ value }) => {
    if (Array.isArray(value)) {
      return value.map((item) => String(item).trim()).filter(Boolean);
    }

    if (typeof value === 'string') {
      return value
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);
    }

    return undefined;
  })
  @IsOptional()
  tags?: string[];

  @IsString()
  @MaxLength(200)
  @IsOptional()
  keyword?: string;

  @IsEnum(QuestionSortBy)
  @IsOptional()
  sortBy?: QuestionSortBy;

  @IsEnum(SortOrder)
  @IsOptional()
  sortOrder?: SortOrder;
}
