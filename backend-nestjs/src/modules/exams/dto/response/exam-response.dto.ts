import { ApiProperty } from '@nestjs/swagger';
import { AnswerChoice, ExamStatus } from '@prisma/client';
import {
  ExamLightweight,
  ExamWithRelations,
} from '../../repositories/exams.repository';

export class ExamClassResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  subject!: string;

  @ApiProperty({ example: '2025-2026' })
  schoolYear!: string;

  @ApiProperty({ example: 'EDU-ABC123' })
  code!: string;
}

export class AnswerKeyResponseDto {
  @ApiProperty({ example: 1 })
  questionNumber!: number;

  @ApiProperty({ enum: AnswerChoice, enumName: 'AnswerChoice' })
  correctAnswer!: AnswerChoice;
}

export class ExamVariantResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'A1' })
  testCode!: string;

  @ApiProperty({ type: [AnswerKeyResponseDto] })
  answerKeys!: AnswerKeyResponseDto[];
}

export class ExamResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  title!: string;

  @ApiProperty()
  questionCount!: number;

  @ApiProperty()
  maxScore!: number;

  @ApiProperty({ enum: ExamStatus, enumName: 'ExamStatus' })
  status!: ExamStatus;

  @ApiProperty({ format: 'uuid' })
  teacherId!: string;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt!: Date;

  @ApiProperty({ type: String, format: 'date-time' })
  updatedAt!: Date;

  @ApiProperty({ type: [ExamClassResponseDto] })
  classes!: ExamClassResponseDto[];

  @ApiProperty({ type: [ExamVariantResponseDto] })
  variants!: ExamVariantResponseDto[];

  @ApiProperty({ example: 0 })
  submissionCount?: number;
}

export class PaginatedExamResponseDto {
  @ApiProperty({ type: [ExamResponseDto] })
  data!: ExamResponseDto[];

  @ApiProperty()
  total!: number;

  @ApiProperty()
  page!: number;

  @ApiProperty()
  limit!: number;
}

export class DeleteExamResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: true })
  deleted!: true;
}

export function toExamResponseDto(exam: ExamWithRelations): ExamResponseDto {
  return {
    id: exam.id,
    title: exam.title,
    questionCount: exam.questionCount,
    maxScore: exam.maxScore,
    status: exam.status,
    teacherId: exam.teacherId,
    createdAt: exam.createdAt,
    updatedAt: exam.updatedAt,
    classes: (exam.classes ?? []).map((item) => ({
      id: item.class.id,
      name: item.class.name,
      subject: item.class.subject,
      schoolYear: item.class.schoolYear,
      code: item.class.code,
    })),
    variants: (exam.variants ?? []).map((variant) => ({
      id: variant.id,
      testCode: variant.testCode,
      answerKeys: (variant.answerKeys ?? []).map((item) => ({
        questionNumber: item.questionNumber,
        correctAnswer: item.correctAnswer,
      })),
    })),
    submissionCount: exam._count?.submissions ?? 0,
  };
}

export function toExamListResponseDto(exam: ExamLightweight): ExamResponseDto {
  return {
    id: exam.id,
    title: exam.title,
    questionCount: exam.questionCount,
    maxScore: exam.maxScore,
    status: exam.status,
    teacherId: exam.teacherId,
    createdAt: exam.createdAt,
    updatedAt: exam.updatedAt,
    classes: (exam.classes ?? []).map((item) => ({
      id: item.class.id,
      name: item.class.name,
      subject: item.class.subject,
      schoolYear: item.class.schoolYear,
      code: item.class.code,
    })),
    variants: (exam.variants ?? []).map((variant) => ({
      id: variant.id,
      testCode: variant.testCode,
      answerKeys: (variant.answerKeys ?? []).map((item) => ({
        questionNumber: item.questionNumber,
        correctAnswer: AnswerChoice.A,
      })),
    })),
    submissionCount: exam._count?.submissions ?? 0,
  };
}
