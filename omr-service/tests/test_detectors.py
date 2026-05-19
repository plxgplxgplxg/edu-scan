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
