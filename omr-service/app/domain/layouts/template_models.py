from __future__ import annotations

from pydantic import BaseModel, Field


class BoundingBoxRatio(BaseModel):
    x: float = Field(ge=0, le=1)
    y: float = Field(ge=0, le=1)
    width: float = Field(gt=0, le=1)
    height: float = Field(gt=0, le=1)


class GridSpec(BaseModel):
    rows: int = Field(gt=0)
    columns: int = Field(gt=0)


class IdFieldTemplate(BaseModel):
    name: str
    code_length: int = Field(gt=0)
    region: BoundingBoxRatio
    grid: GridSpec
    primary: bool = False


class AnswerGroupTemplate(BaseModel):
    region: BoundingBoxRatio
    question_start: int = Field(gt=0)
    question_end: int = Field(gt=0)


class OmrLayoutTemplate(BaseModel):
    name: str
    aliases: list[str] = Field(default_factory=list)
    question_count: int = Field(gt=0)
    answer_options: list[str] = Field(default_factory=lambda: ["A", "B", "C", "D"])
    id_fields: list[IdFieldTemplate] = Field(default_factory=list)
    student_id_length: int | None = Field(default=None, gt=0)
    student_id_region: BoundingBoxRatio | None = None
    student_id_grid: GridSpec | None = None
    answer_groups: list[AnswerGroupTemplate] = Field(default_factory=list)
    answer_region: BoundingBoxRatio
    answer_columns: int = Field(gt=0)
    notes: str | None = None
