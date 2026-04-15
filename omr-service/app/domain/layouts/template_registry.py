from __future__ import annotations

import json
from pathlib import Path

from app.domain.layouts.template_models import OmrLayoutTemplate


DEFAULT_TEMPLATES = [
    OmrLayoutTemplate(
        name="institute_60_4col",
        aliases=["layout_60_4col", "60q_4col", "generic_60q_4col"],
        question_count=60,
        id_fields=[
            {
                "name": "roll_no",
                "code_length": 10,
                "region": {"x": 0.03, "y": 0.09, "width": 0.25, "height": 0.20},
                "grid": {"rows": 10, "columns": 10},
                "primary": True,
            },
            {
                "name": "test_id",
                "code_length": 3,
                "region": {"x": 0.29, "y": 0.09, "width": 0.07, "height": 0.20},
                "grid": {"rows": 10, "columns": 3},
                "primary": False,
            },
        ],
        student_id_length=10,
        student_id_region={"x": 0.03, "y": 0.09, "width": 0.25, "height": 0.20},
        student_id_grid={"rows": 10, "columns": 10},
        answer_groups=[
            {
                "region": {"x": 0.10, "y": 0.39, "width": 0.18, "height": 0.39},
                "question_start": 1,
                "question_end": 15,
            },
            {
                "region": {"x": 0.32, "y": 0.39, "width": 0.18, "height": 0.39},
                "question_start": 16,
                "question_end": 30,
            },
            {
                "region": {"x": 0.54, "y": 0.39, "width": 0.18, "height": 0.39},
                "question_start": 31,
                "question_end": 45,
            },
            {
                "region": {"x": 0.76, "y": 0.39, "width": 0.18, "height": 0.39},
                "question_start": 46,
                "question_end": 60,
            },
        ],
        answer_region={"x": 0.06, "y": 0.33, "width": 0.86, "height": 0.54},
        answer_columns=4,
        notes="Template for sheets similar to the 'Your Institute Name & Logo' 60-question 4-column sample.",
    ),
    OmrLayoutTemplate(
        name="generic_100q_2col",
        aliases=["layout_100_2col", "100q_2col"],
        question_count=100,
        student_id_length=6,
        student_id_region={"x": 0.05, "y": 0.10, "width": 0.38, "height": 0.26},
        student_id_grid={"rows": 10, "columns": 6},
        id_fields=[
            {
                "name": "student_code",
                "code_length": 6,
                "region": {"x": 0.05, "y": 0.10, "width": 0.38, "height": 0.26},
                "grid": {"rows": 10, "columns": 6},
                "primary": True,
            }
        ],
        answer_groups=[
            {
                "region": {"x": 0.48, "y": 0.12, "width": 0.22, "height": 0.78},
                "question_start": 1,
                "question_end": 50,
            },
            {
                "region": {"x": 0.71, "y": 0.12, "width": 0.22, "height": 0.78},
                "question_start": 51,
                "question_end": 100,
            },
        ],
        answer_region={"x": 0.48, "y": 0.12, "width": 0.45, "height": 0.78},
        answer_columns=2,
        notes="Template for sheets with a narrow metadata panel and 100 answers split into 2 columns.",
    ),
    OmrLayoutTemplate(
        name="generic_60q_3col",
        aliases=["layout_60_3col", "school_60q"],
        question_count=60,
        student_id_length=2,
        student_id_region={"x": 0.78, "y": 0.09, "width": 0.14, "height": 0.22},
        student_id_grid={"rows": 10, "columns": 2},
        id_fields=[
            {
                "name": "roll_no",
                "code_length": 2,
                "region": {"x": 0.78, "y": 0.09, "width": 0.14, "height": 0.22},
                "grid": {"rows": 10, "columns": 2},
                "primary": True,
            }
        ],
        answer_groups=[
            {
                "region": {"x": 0.14, "y": 0.42, "width": 0.20, "height": 0.44},
                "question_start": 1,
                "question_end": 20,
            },
            {
                "region": {"x": 0.37, "y": 0.42, "width": 0.20, "height": 0.44},
                "question_start": 21,
                "question_end": 40,
            },
            {
                "region": {"x": 0.60, "y": 0.42, "width": 0.20, "height": 0.44},
                "question_start": 41,
                "question_end": 60,
            },
        ],
        answer_region={"x": 0.14, "y": 0.42, "width": 0.68, "height": 0.44},
        answer_columns=3,
        notes="Template for school sheets with metadata blocks above and 3 answer columns.",
    ),
]


class TemplateRegistry:
    def __init__(self, templates: list[OmrLayoutTemplate] | None = None) -> None:
        active_templates = templates or DEFAULT_TEMPLATES
        self._templates = {template.name: template for template in active_templates}
        self._alias_lookup = {
            alias: template.name
            for template in active_templates
            for alias in [template.name, *template.aliases]
        }

    def list_templates(self) -> list[OmrLayoutTemplate]:
        return [self._templates[name] for name in sorted(self._templates)]

    def get(self, name_or_alias: str) -> OmrLayoutTemplate | None:
        resolved_name = self._alias_lookup.get(name_or_alias)
        if not resolved_name:
            return None
        return self._templates[resolved_name]

    def register(self, template: OmrLayoutTemplate) -> None:
        self._templates[template.name] = template
        for alias in [template.name, *template.aliases]:
            self._alias_lookup[alias] = template.name

    def load_directory(self, directory: str | Path) -> int:
        path = Path(directory)
        loaded = 0
        for file_path in sorted(path.glob("*.json")):
            payload = json.loads(file_path.read_text(encoding="utf-8"))
            self.register(OmrLayoutTemplate.model_validate(payload))
            loaded += 1
        return loaded
