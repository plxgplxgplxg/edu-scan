from typing import Literal

from pydantic import BaseModel


ReviewReason = Literal["MULTI_MARK", "BLANK", "LOW_CONFIDENCE"]


class OmrArtifactsResponse(BaseModel):
    processedImagePath: str | None = None
    annotatedImagePath: str | None = None
    warpOverlayPath: str | None = None
    answerScoresPath: str | None = None
    resultJsonPath: str | None = None

class OmrAnswerResponse(BaseModel):
    questionNumber: int
    detectedAnswer: str | None
    correctAnswer: str | None = None
    isCorrect: bool | None = None
    needsReview: bool
    reviewReason: ReviewReason | None = None


class OmrProcessResponse(BaseModel):
    studentCode: str | None
    testId: str | None = None
    needsReview: bool
    answers: list[OmrAnswerResponse]
    artifacts: OmrArtifactsResponse


class OmrGradeOverlayResponse(BaseModel):
    artifacts: OmrArtifactsResponse
