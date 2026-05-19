import cv2
import numpy as np

from app.domain.layouts.layout_classifier import LayoutClassifier
from app.domain.layouts.template_registry import TemplateRegistry


def _build_institute_like_sheet(width: int = 1200, height: int = 1800) -> np.ndarray:
    image = np.full((height, width), 0, dtype=np.uint8)

    # Two compact metadata blocks in the top-left half.
    for x, y, w, h in [
        (0.05, 0.12, 0.16, 0.11),
        (0.24, 0.12, 0.16, 0.11),
    ]:
        cv2.rectangle(
            image,
            (int(width * x), int(height * y)),
            (int(width * (x + w)), int(height * (y + h))),
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


def _build_tnteam_like_sheet(width: int = 1600, height: int = 2300) -> np.ndarray:
    image = np.full((height, width), 0, dtype=np.uint8)

    # Dense title / metadata area with separated blocks.
    for block in [
        (0.05, 0.10, 0.045, 0.05),
        (0.125, 0.10, 0.045, 0.05),
        (0.20, 0.10, 0.045, 0.05),
        (0.275, 0.10, 0.045, 0.05),
        (0.35, 0.10, 0.045, 0.05),
    ]:
        x, y, w, h = block
        cv2.rectangle(
            image,
            (int(width * x), int(height * y)),
            (int(width * (x + w)), int(height * (y + h))),
            255,
            -1,
        )

    # Marker squares that create extra vertical clusters.
    for x, y in [
        (0.12, 0.12),
        (0.80, 0.12),
        (0.12, 0.41),
        (0.80, 0.41),
        (0.37, 0.38),
        (0.53, 0.38),
    ]:
        cv2.rectangle(
            image,
            (int(width * x), int(height * y)),
            (int(width * x) + 28, int(height * y) + 28),
            255,
            -1,
        )

    # Four answer areas across two rows.
    for x, y, w, h in [
        (0.50, 0.40, 0.11, 0.15),
        (0.66, 0.40, 0.11, 0.15),
        (0.19, 0.58, 0.11, 0.22),
        (0.35, 0.58, 0.11, 0.22),
        (0.50, 0.58, 0.11, 0.22),
        (0.66, 0.58, 0.11, 0.22),
    ]:
        cv2.rectangle(
            image,
            (int(width * x), int(height * y)),
            (int(width * (x + w)), int(height * (y + h))),
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


def test_layout_classifier_identifies_tnteam_60_4col_ad():
    classifier = LayoutClassifier(TemplateRegistry())
    processed = _build_tnteam_like_sheet()

    template = classifier.classify(processed, question_count=60)

    assert template is not None
    assert template.name == "tnteam_60q_4col_ad"


def test_layout_classifier_returns_none_for_unknown_question_count():
    classifier = LayoutClassifier(TemplateRegistry())
    processed = _build_institute_like_sheet()

    template = classifier.classify(processed, question_count=77)

    assert template is None
