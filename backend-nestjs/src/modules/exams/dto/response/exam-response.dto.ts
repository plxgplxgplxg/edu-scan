import { AnswerChoice } from '@prisma/client';
import { ExamWithRelations } from '../../repositories/exams.repository';

export class ExamClassResponseDto {
  id!: string;
  name!: string;
  subject!: string;
  schoolYear!: string;
  code!: string;
}

export class ExamQuestionReferenceResponseDto {
  id!: string;
  content!: string;
  subject!: string;
  difficulty!: string;
}

export class AnswerKeyResponseDto {
  questionNumber!: number;
  correctAnswer!: AnswerChoice;
}

export class ExamQuestionMapResponseDto {
  questionNumber!: number;
  questionId!: string | null;
  question?: ExamQuestionReferenceResponseDto | null;
}

export class ExamResponseDto {
  id!: string;
  title!: string;
  maxScore!: number;
  teacherId!: string;
  createdAt!: Date;
  updatedAt!: Date;
  classes!: ExamClassResponseDto[];
  answerKeys!: AnswerKeyResponseDto[];
  questionMap!: ExamQuestionMapResponseDto[];
}

export class DeleteExamResponseDto {
  id!: string;
  deleted!: true;
}

export function toExamResponseDto(exam: ExamWithRelations): ExamResponseDto {
  return {
    id: exam.id,
    title: exam.title,
    maxScore: exam.maxScore,
    teacherId: exam.teacherId,
    createdAt: exam.createdAt,
    updatedAt: exam.updatedAt,
    classes: exam.classes.map((item) => ({
      id: item.class.id,
      name: item.class.name,
      subject: item.class.subject,
      schoolYear: item.class.schoolYear,
      code: item.class.code,
    })),
    answerKeys: exam.answerKeys.map((item) => ({
      questionNumber: item.questionNumber,
      correctAnswer: item.correctAnswer,
    })),
    questionMap: exam.questionMap.map((item) => ({
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
  };
}
