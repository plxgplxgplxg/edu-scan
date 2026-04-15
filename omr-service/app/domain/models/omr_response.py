from typing import Literal

from pydantic import BaseModel


AnswerChoice = Literal["A", "B", "C", "D"]


class OmrAnswerResponse(BaseModel):
    questionNumber: int
    detectedAnswer: AnswerChoice | None
    needsReview: bool


class OmrProcessResponse(BaseModel):
    studentCode: str | None
    needsReview: bool
    answers: list[OmrAnswerResponse]
