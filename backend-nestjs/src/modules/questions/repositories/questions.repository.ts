import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../database/prisma.service';
import {
  QueryQuestionsDto,
  QuestionSortBy,
  SortOrder,
} from '../dtos/query-questions.dto';
import { QuestionWithTagsEntity } from '../dtos/question-response.dto';

const questionWithTagsInclude = {
  tags: {
    include: {
      tag: true,
    },
  },
} satisfies Prisma.QuestionInclude;

export type TeacherQuestionListResult = {
  items: QuestionWithTagsEntity[];
  total: number;
  page: number;
  limit: number;
};

type QuestionUpsertPayload = {
  content: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctAnswer: Prisma.QuestionCreateInput['correctAnswer'];
  subject: string;
  difficulty: Prisma.QuestionCreateInput['difficulty'];
  tags: string[];
};

type QuestionUpdatePayload = {
  content?: string;
  optionA?: string;
  optionB?: string;
  optionC?: string;
  optionD?: string;
  correctAnswer?: Prisma.QuestionUpdateInput['correctAnswer'];
  subject?: string;
  difficulty?: Prisma.QuestionUpdateInput['difficulty'];
  tags?: string[];
};

@Injectable()
export class QuestionsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findQuestionOwner(
    questionId: string,
  ): Promise<{ teacherId: string } | null> {
    return this.prisma.question.findUnique({
      where: { id: questionId },
      select: { teacherId: true },
    });
  }

  async createQuestion(
    teacherId: string,
    payload: QuestionUpsertPayload,
  ): Promise<QuestionWithTagsEntity> {
    return this.prisma.$transaction(async (tx) => {
      const question = await tx.question.create({
        data: {
          content: payload.content,
          optionA: payload.optionA,
          optionB: payload.optionB,
          optionC: payload.optionC,
          optionD: payload.optionD,
          correctAnswer: payload.correctAnswer,
          subject: payload.subject,
          difficulty: payload.difficulty,
          teacherId,
        },
      });

      if (payload.tags.length > 0) {
        const tagIds = await this.resolveTagIds(tx, payload.tags);

        await tx.questionTag.createMany({
          data: tagIds.map((tagId) => ({
            questionId: question.id,
            tagId,
          })),
          skipDuplicates: true,
        });
      }

      return tx.question.findUniqueOrThrow({
        where: { id: question.id },
        include: questionWithTagsInclude,
      });
    });
  }

  async listQuestionsForTeacher(
    teacherId: string,
    query: QueryQuestionsDto & {
      page: number;
      limit: number;
      sortBy: QuestionSortBy;
      sortOrder: SortOrder;
    },
  ): Promise<TeacherQuestionListResult> {
    const where: Prisma.QuestionWhereInput = {
      teacherId,
    };

    if (query.subject) {
      where.subject = {
        contains: query.subject,
        mode: 'insensitive',
      };
    }

    if (query.difficulty) {
      where.difficulty = query.difficulty;
    }

    if (query.keyword) {
      where.OR = [
        { content: { contains: query.keyword, mode: 'insensitive' } },
        { optionA: { contains: query.keyword, mode: 'insensitive' } },
        { optionB: { contains: query.keyword, mode: 'insensitive' } },
        { optionC: { contains: query.keyword, mode: 'insensitive' } },
        { optionD: { contains: query.keyword, mode: 'insensitive' } },
      ];
    }

    if (query.tags && query.tags.length > 0) {
      where.tags = {
        some: {
          OR: query.tags.map((tagName) => ({
            tag: {
              name: {
                equals: tagName,
                mode: 'insensitive',
              },
            },
          })),
        },
      };
    }

    const orderBy = {
      [query.sortBy]: query.sortOrder,
    } as Prisma.QuestionOrderByWithRelationInput;

    const [items, total] = await this.prisma.$transaction([
      this.prisma.question.findMany({
        where,
        include: questionWithTagsInclude,
        orderBy,
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      this.prisma.question.count({ where }),
    ]);

    return {
      items,
      total,
      page: query.page,
      limit: query.limit,
    };
  }

  async findQuestionByIdForTeacher(
    questionId: string,
    teacherId: string,
  ): Promise<QuestionWithTagsEntity | null> {
    return this.prisma.question.findFirst({
      where: {
        id: questionId,
        teacherId,
      },
      include: questionWithTagsInclude,
    });
  }

  async updateQuestionForTeacher(
    questionId: string,
    teacherId: string,
    payload: QuestionUpdatePayload,
  ): Promise<QuestionWithTagsEntity | null> {
    return this.prisma.$transaction(async (tx) => {
      const { tags, ...questionData } = payload;

      const updated = await tx.question.updateMany({
        where: {
          id: questionId,
          teacherId,
        },
        data: questionData,
      });

      if (updated.count === 0) {
        return null;
      }

      if (tags !== undefined) {
        const tagIds = await this.resolveTagIds(tx, tags);

        await tx.questionTag.deleteMany({
          where: {
            questionId,
            tagId: {
              notIn: tagIds,
            },
          },
        });

        if (tagIds.length > 0) {
          await tx.questionTag.createMany({
            data: tagIds.map((tagId) => ({ questionId, tagId })),
            skipDuplicates: true,
          });
        }
      }

      return tx.question.findFirst({
        where: {
          id: questionId,
          teacherId,
        },
        include: questionWithTagsInclude,
      });
    });
  }

  async deleteQuestionForTeacher(
    questionId: string,
    teacherId: string,
  ): Promise<{ count: number }> {
    return this.prisma.question.deleteMany({
      where: {
        id: questionId,
        teacherId,
      },
    });
  }

  private async resolveTagIds(
    tx: Prisma.TransactionClient,
    tags: string[],
  ): Promise<string[]> {
    if (tags.length === 0) {
      return [];
    }

    const tagClauses = tags.map((name) => ({
      name: {
        equals: name,
        mode: 'insensitive' as const,
      },
    }));

    const existingTags = await tx.tag.findMany({
      where: {
        OR: tagClauses,
      },
      select: {
        id: true,
        name: true,
      },
    });

    const existingByNormalizedName = new Map(
      existingTags.map((tag) => [tag.name.toLowerCase(), tag.id]),
    );

    const missingTagNames = tags.filter(
      (name) => !existingByNormalizedName.has(name.toLowerCase()),
    );

    if (missingTagNames.length > 0) {
      await tx.tag.createMany({
        data: missingTagNames.map((name) => ({ name })),
        skipDuplicates: true,
      });
    }

    const syncedTags = await tx.tag.findMany({
      where: {
        OR: tagClauses,
      },
      select: {
        id: true,
      },
    });

    return syncedTags.map((tag) => tag.id);
  }
}
