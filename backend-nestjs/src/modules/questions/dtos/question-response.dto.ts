import { ApiProperty } from '@nestjs/swagger';
import { AnswerChoice, Difficulty, Prisma } from '@prisma/client';

export class QuestionResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  content!: string;

  @ApiProperty()
  optionA!: string;

  @ApiProperty()
  optionB!: string;

  @ApiProperty()
  optionC!: string;

  @ApiProperty()
  optionD!: string;

  @ApiProperty({ enum: AnswerChoice, enumName: 'AnswerChoice' })
  correctAnswer!: AnswerChoice;

  @ApiProperty()
  subject!: string;

  @ApiProperty({ enum: Difficulty, enumName: 'Difficulty' })
  difficulty!: Difficulty;

  @ApiProperty({ type: [String] })
  tags!: string[];

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt!: Date;

  @ApiProperty({ type: String, format: 'date-time' })
  updatedAt!: Date;
}

export class QuestionListResponseDto {
  @ApiProperty({ type: [QuestionResponseDto] })
  items!: QuestionResponseDto[];

  @ApiProperty()
  total!: number;

  @ApiProperty()
  page!: number;

  @ApiProperty()
  limit!: number;

  @ApiProperty()
  totalPages!: number;
}

export class DeleteQuestionResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  deleted!: boolean;
}

export type QuestionWithTagsEntity = Prisma.QuestionGetPayload<{
  include: {
    tags: {
      include: {
        tag: true;
      };
    };
  };
}>;

export function toQuestionResponseDto(
  entity: QuestionWithTagsEntity,
): QuestionResponseDto {
  return {
    id: entity.id,
    content: entity.content,
    optionA: entity.optionA,
    optionB: entity.optionB,
    optionC: entity.optionC,
    optionD: entity.optionD,
    correctAnswer: entity.correctAnswer,
    subject: entity.subject,
    difficulty: entity.difficulty,
    tags: entity.tags
      .map((item) => item.tag.name)
      .sort((left, right) => left.localeCompare(right)),
    createdAt: entity.createdAt,
    updatedAt: entity.updatedAt,
  };
}

export function toQuestionListResponseDto(payload: {
  items: QuestionWithTagsEntity[];
  total: number;
  page: number;
  limit: number;
}): QuestionListResponseDto {
  return {
    items: payload.items.map(toQuestionResponseDto),
    total: payload.total,
    page: payload.page,
    limit: payload.limit,
    totalPages:
      payload.total === 0 ? 0 : Math.ceil(payload.total / payload.limit),
  };
}
