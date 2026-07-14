from pathlib import Path
from typing import Literal

from pydantic import BaseModel, Field, HttpUrl, model_validator


class OmrAnswerKeyItem(BaseModel):
    questionNumber: int = Field(gt=0)
    correctAnswer: Literal["A", "B", "C", "D"]


class OmrQuestionMark(BaseModel):
    questionNumber: int = Field(gt=0)
    status: Literal["CORRECT", "WRONG", "REVIEW"]


class OmrDetectRequest(BaseModel):
    imageUrl: HttpUrl
    templateName: str | None = None


class OmrGradeOverlayRequest(BaseModel):
    resultJsonPath: str
    marks: list[OmrQuestionMark] = Field(min_length=1, max_length=200)

    @model_validator(mode="after")
    def validate_payload(self) -> "OmrGradeOverlayRequest":
        seen_numbers: set[int] = set()
        for item in self.marks:
            if item.questionNumber in seen_numbers:
                raise ValueError(
                    f"Duplicated mark questionNumber {item.questionNumber}",
                )
            seen_numbers.add(item.questionNumber)

        result_path = Path(self.resultJsonPath)
        if not result_path.exists():
            raise ValueError(f"resultJsonPath does not exist: {self.resultJsonPath}")

        return self


class OmrProcessRequest(OmrDetectRequest):
    answerKey: list[OmrAnswerKeyItem] = Field(min_length=1, max_length=200)

    @model_validator(mode="after")
    def validate_answer_key(self) -> "OmrProcessRequest":
        seen_numbers: set[int] = set()
        for item in self.answerKey:
            if item.questionNumber in seen_numbers:
                raise ValueError(
                    f"Duplicated answer key questionNumber {item.questionNumber}",
                )
            seen_numbers.add(item.questionNumber)

        return self
