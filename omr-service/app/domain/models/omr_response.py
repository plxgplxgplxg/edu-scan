from pydantic import BaseModel

class OmrAnswerResponse(BaseModel):
    questionNumber: int
    detectedAnswer: str | None
    needsReview: bool


class OmrProcessResponse(BaseModel):
    studentCode: str | None
    needsReview: bool
    answers: list[OmrAnswerResponse]
