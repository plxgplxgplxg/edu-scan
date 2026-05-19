export interface OmrAnswerResult {
  questionNumber: number;
  detectedAnswer: string | null;
  needsReview?: boolean;
  reviewReason?: string | null;
}

export interface OmrArtifactResult {
  processedImagePath?: string | null;
  annotatedImagePath?: string | null;
  warpOverlayPath?: string | null;
  answerScoresPath?: string | null;
  resultJsonPath?: string | null;
}

export interface OmrServiceResponse {
  studentCode: string | null;
  testId?: string | null;
  answers: OmrAnswerResult[];
  needsReview?: boolean;
  artifacts?: OmrArtifactResult;
}

export interface OmrGradeOverlayResponse {
  artifacts?: OmrArtifactResult;
}
