export interface OmrAnswerResult {
  questionNumber: number;
  detectedAnswer: string | null;
  needsReview?: boolean;
}

export interface OmrServiceResponse {
  studentCode: string | null;
  answers: OmrAnswerResult[];
  needsReview?: boolean;
}
