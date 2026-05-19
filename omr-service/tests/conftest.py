import cv2
import numpy as np
import pytest

from app.domain.layouts.template_registry import TemplateRegistry


@pytest.fixture
def synthetic_sheet_builder():
    def _build(
        student_code: str = "2022487101",
        test_id: str = "123",
        answers: str = "ABCDABCD",
        ambiguous_questions: set[int] | None = None,
        blank_questions: set[int] | None = None,
        draw_outlines: bool = True,
        width: int = 1200,
        height: int = 1800,
    ) -> np.ndarray:
        ambiguous_questions = ambiguous_questions or set()
        blank_questions = blank_questions or set()

        image = np.full((height, width, 3), 255, dtype=np.uint8)
        template = TemplateRegistry().get("institute_60_4col")
        assert template is not None

        field_values = {
            "roll_no": student_code,
            "test_id": test_id,
        }

        for field in template.id_fields:
            value = field_values[field.name]
            left = int(width * field.region.x)
            top = int(height * field.region.y)
            field_width = int(width * field.region.width)
            field_height = int(height * field.region.height)

            for column_index, digit in enumerate(value):
                x_start = left + int(field_width * column_index / field.code_length)
                x_end = left + int(field_width * (column_index + 1) / field.code_length)
                x_center = (x_start + x_end) // 2

                for row_index in range(field.grid.rows):
                    y_start = top + int(field_height * row_index / field.grid.rows)
                    y_end = top + int(field_height * (row_index + 1) / field.grid.rows)
                    y_center = (y_start + y_end) // 2
                    radius = max(6, min(x_end - x_start, y_end - y_start) // 4)
                    if draw_outlines:
                        cv2.circle(image, (x_center, y_center), radius, (0, 0, 0), 2)
                    if row_index == int(digit):
                        cv2.circle(image, (x_center, y_center), radius, (0, 0, 0), -1)

        for group in template.answer_groups:
            left = int(width * group.region.x)
            top = int(height * group.region.y)
            group_width = int(width * group.region.width)
            group_height = int(height * group.region.height)
            group_question_count = group.question_end - group.question_start + 1

            for question_number in range(group.question_start, group.question_end + 1):
                if question_number > len(answers):
                    break

                answer = answers[question_number - 1]
                offset = question_number - group.question_start
                row_start = top + int(group_height * offset / group_question_count)
                row_end = top + int(group_height * (offset + 1) / group_question_count)
                y_center = (row_start + row_end) // 2

                for option_index, option in enumerate("ABCD"):
                    x_start = left + int(group_width * option_index / 4)
                    x_end = left + int(group_width * (option_index + 1) / 4)
                    x_center = (x_start + x_end) // 2
                    radius = max(8, min(x_end - x_start, row_end - row_start) // 4)
                    if draw_outlines:
                        cv2.circle(image, (x_center, y_center), radius, (0, 0, 0), 2)

                    should_fill = (
                        question_number not in blank_questions and option == answer
                    ) or (
                        question_number in ambiguous_questions and option in {answer, "B"}
                    )
                    if should_fill:
                        cv2.circle(image, (x_center, y_center), radius, (0, 0, 0), -1)

        return image

    return _build
