import cv2
import numpy as np

from app.domain.layouts.layout_classifier import LayoutClassifier
from app.domain.layouts.template_registry import TemplateRegistry


def _build_institute_like_sheet(width: int = 1200, height: int = 1800) -> np.ndarray:
    image = np.full((height, width), 0, dtype=np.uint8)

    # Student id / roll number blocks in the top-left half.
    for column_index in range(13):
        x_start = int(width * 0.03) + int(width * 0.40 * column_index / 13)
        x_end = int(width * 0.03) + int(width * 0.40 * (column_index + 1) / 13)
        cv2.rectangle(
            image,
            (x_start + 4, int(height * 0.12)),
            (x_end - 4, int(height * 0.24)),
            255,
            -1,
        )

    # Four answer columns.
    answer_left = int(width * 0.06)
    answer_top = int(height * 0.33)
    answer_width = int(width * 0.86)
    answer_height = int(height * 0.54)
    for column_index in range(4):
        x_start = answer_left + int(answer_width * column_index / 4)
        x_end = answer_left + int(answer_width * (column_index + 1) / 4)
        cv2.rectangle(
            image,
            (x_start + 8, answer_top + 8),
            (x_end - 8, answer_top + answer_height - 8),
            255,
            -1,
        )

    return image


def test_layout_classifier_identifies_institute_60_4col():
    classifier = LayoutClassifier(TemplateRegistry())
    processed = _build_institute_like_sheet()

    template = classifier.classify(processed, question_count=60)

    assert template is not None
    assert template.name == "institute_60_4col"


def test_layout_classifier_returns_none_for_unknown_question_count():
    classifier = LayoutClassifier(TemplateRegistry())
    processed = _build_institute_like_sheet()

    template = classifier.classify(processed, question_count=77)

    assert template is None
