import { ApiProperty } from '@nestjs/swagger';
import { AnswerChoice, Difficulty, ExamStatus, ExamType, QuestionType } from '@prisma/client';
import { ExamWithRelations } from '../../repositories/exams.repository';

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

export class ExamQuestionReferenceResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  content!: string;

  @ApiProperty()
  subject!: string;

  @ApiProperty({ enum: Difficulty, enumName: 'Difficulty' })
  difficulty!: Difficulty;
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

export class ExamQuestionMapResponseDto {
  @ApiProperty({ example: 1 })
  questionNumber!: number;

  @ApiProperty({ format: 'uuid', nullable: true })
  questionId!: string | null;

  @ApiProperty({ type: ExamQuestionReferenceResponseDto, nullable: true })
  question?: ExamQuestionReferenceResponseDto | null;
}

export class ClassExamQuestionResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 1 })
  orderIndex!: number;

  @ApiProperty({ enum: QuestionType, enumName: 'QuestionType' })
  type!: QuestionType;

  @ApiProperty()
  content!: string;

  @ApiProperty({ nullable: true })
  optionA!: string | null;

  @ApiProperty({ nullable: true })
  optionB!: string | null;

  @ApiProperty({ nullable: true })
  optionC!: string | null;

  @ApiProperty({ nullable: true })
  optionD!: string | null;

  @ApiProperty({ enum: AnswerChoice, nullable: true })
  answerChoice!: AnswerChoice | null;

  @ApiProperty({ nullable: true })
  answerText!: string | null;

  @ApiProperty()
  maxScore!: number;
}

export class ExamResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  title!: string;

  @ApiProperty()
  maxScore!: number;

  @ApiProperty({ enum: ExamStatus, enumName: 'ExamStatus' })
  status!: ExamStatus;
  @ApiProperty({ enum: ExamType, enumName: 'ExamType' })
  type!: ExamType;

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

  @ApiProperty({ type: [ExamQuestionMapResponseDto] })
  questionMap!: ExamQuestionMapResponseDto[];
  @ApiProperty({ type: [ClassExamQuestionResponseDto] })
  classQuestions!: ClassExamQuestionResponseDto[];
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
    maxScore: exam.maxScore,
    status: exam.status,
    type: exam.type,
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
    questionMap: (exam.questionMap ?? []).map((item) => ({
      questionNumber: item.questionNumber,
      questionId: item.questionId,
      question: item.question
        ? {
            id: item.question.id,
            content: item.question.content,
            subject: item.question.subject,
            difficulty: item.question.difficulty,
          }
        : null,
    })),
    classQuestions: (exam.classQuestions ?? []).map((item) => ({
      id: item.id,
      orderIndex: item.orderIndex,
      type: item.type,
      content: item.content,
      optionA: item.optionA,
      optionB: item.optionB,
      optionC: item.optionC,
      optionD: item.optionD,
      answerChoice: item.answerChoice,
      answerText: item.answerText,
      maxScore: item.maxScore,
    })),
  };
}
