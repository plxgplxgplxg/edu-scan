import { AnswerChoice, Difficulty, Prisma } from '@prisma/client';

export class QuestionResponseDto {
  id!: string;
  content!: string;
  optionA!: string;
  optionB!: string;
  optionC!: string;
  optionD!: string;
  correctAnswer!: AnswerChoice;
  subject!: string;
  difficulty!: Difficulty;
  tags!: string[];
  createdAt!: Date;
  updatedAt!: Date;
}

export class QuestionListResponseDto {
  items!: QuestionResponseDto[];
  total!: number;
  page!: number;
  limit!: number;
  totalPages!: number;
}

export class DeleteQuestionResponseDto {
  id!: string;
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
