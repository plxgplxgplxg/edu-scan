import cv2
import numpy as np

from app.domain.layouts.template_registry import TemplateRegistry
from app.domain.services.answer_detector import AnswerDetector
from app.domain.services.image_processor import ImageProcessor
from app.domain.services.student_id_detector import StudentIdDetector


def test_student_id_detector_reads_synthetic_code(synthetic_sheet_builder):
    image = synthetic_sheet_builder(
        student_code="2022487101",
        test_id="123",
        draw_outlines=False,
    )
    processor = ImageProcessor()
    processor.sheet_aligner.align = lambda current_image: current_image
    processed = processor.preprocess(image)
    template = TemplateRegistry().get("institute_60_4col")

    detector = StudentIdDetector()
    detector.anchor_locator.locate = lambda image, region: detector._extract_region(image, region)
    student_code = detector.detect(processed, template)
    fields = detector.detect_fields(processed, template)

    assert student_code == "2022487101"
    assert fields["roll_no"] == "2022487101"
    assert fields["test_id"] == "123"


def test_answer_detector_reads_synthetic_answers(synthetic_sheet_builder):
    expected_answers = "ABCDABCDABCDABC"
    image = synthetic_sheet_builder(answers=expected_answers, draw_outlines=False)
    processor = ImageProcessor()
    processor.sheet_aligner.align = lambda current_image: current_image
    processed = processor.preprocess(image)
    template = TemplateRegistry().get("institute_60_4col")

    detector = AnswerDetector()
    detector.anchor_locator.locate = lambda image, region: detector._extract_region(image, region)
    answers = detector.detect(processed, 15, template)

    assert [answer.detectedAnswer for answer in answers] == list(expected_answers)
    assert all(answer.needsReview is False for answer in answers)


def test_answer_detector_marks_ambiguous_question_for_review(synthetic_sheet_builder):
    image = synthetic_sheet_builder(
        answers="ABCDABCDABCDABC",
        ambiguous_questions={1},
        draw_outlines=False,
    )
    processor = ImageProcessor()
    processor.sheet_aligner.align = lambda current_image: current_image
    processed = processor.preprocess(image)
    template = TemplateRegistry().get("institute_60_4col")

    detector = AnswerDetector()
    detector.anchor_locator.locate = lambda image, region: detector._extract_region(image, region)
    answers = detector.detect(processed, 15, template)

    assert answers[0].detectedAnswer == "AB"
    assert answers[0].needsReview is True


def test_student_id_detector_trims_padded_digit_grid_region():
    detector = StudentIdDetector()
    region = _build_padded_digit_grid_region("011079", code_length=6)

    detected = detector._detect_from_region(region, code_length=6, row_count=10)

    assert detected == "011079"


def test_student_id_detector_trims_padded_test_id_grid_region():
    detector = StudentIdDetector()
    region = _build_padded_digit_grid_region("017", code_length=3)

    detected = detector._detect_from_region(region, code_length=3, row_count=10)

    assert detected == "017"


def _build_padded_digit_grid_region(value: str, code_length: int) -> np.ndarray:
    grid_width = code_length * 44
    grid_height = 10 * 42
    padding_left = 80
    padding_top = 55
    image = np.zeros((grid_height + 120, grid_width + 150), dtype=np.uint8)

    left = padding_left
    top = padding_top
    right = left + grid_width
    bottom = top + grid_height
    cv2.rectangle(image, (left, top), (right, bottom), 255, 2)

    for column_index, digit in enumerate(value):
        x_start = left + int(grid_width * column_index / code_length)
        x_end = left + int(grid_width * (column_index + 1) / code_length)
        x_center = (x_start + x_end) // 2
        for row_index in range(10):
            y_start = top + int(grid_height * row_index / 10)
            y_end = top + int(grid_height * (row_index + 1) / 10)
            y_center = (y_start + y_end) // 2
            radius = max(7, min(x_end - x_start, y_end - y_start) // 4)
            cv2.circle(image, (x_center, y_center), radius, 255, 2)
            if row_index == int(digit):
                cv2.circle(image, (x_center, y_center), radius, 255, -1)

    return image
