import { AnswerChoice } from '@prisma/client';

export interface OmrAnswerResult {
  questionNumber: number;
  detectedAnswer: AnswerChoice | null;
  needsReview?: boolean;
}

export interface OmrServiceResponse {
  studentCode: string | null;
  answers: OmrAnswerResult[];
  needsReview?: boolean;
}
