import json

import cv2

from app.domain.models.omr_request import OmrDetectRequest, OmrGradeOverlayRequest, OmrProcessRequest
from app.domain.models.omr_response import OmrAnswerResponse
from app.domain.services.omr_orchestrator import OmrOrchestrator


def test_detect_returns_detected_values_without_grading(
    monkeypatch,
    synthetic_sheet_builder,
):
    image = synthetic_sheet_builder(student_code="20224871", answers="ABCDABCD")
    orchestrator = OmrOrchestrator()
    template = orchestrator.template_registry.get("institute_60_4col")
    observed_templates = {"student": None, "answer": None}

    monkeypatch.setattr(orchestrator.image_loader, "load_from_url", lambda _url: image)
    monkeypatch.setattr(
        orchestrator,
        "_resolve_template",
        lambda _image, _template_name=None: template,
    )
    monkeypatch.setattr(
        orchestrator.student_id_detector,
        "detect_fields_with_debug",
        lambda _image, _template=None: ({"test_id": "123"}, {}),
    )
    monkeypatch.setattr(
        orchestrator.student_id_detector,
        "detect",
        lambda _image, _template=None: observed_templates.__setitem__("student", _template) or "20224871",
    )
    monkeypatch.setattr(
        orchestrator.answer_detector,
        "detect_with_debug",
        lambda _image, _question_count, _template=None: (
            observed_templates.__setitem__("answer", _template)
            or [
                OmrAnswerResponse(
                    questionNumber=index + 1,
                    detectedAnswer=answer,
                    needsReview=False,
                )
                for index, answer in enumerate("ABCDABCD")
            ],
            {
                "questions": [
                    {
                        "questionNumber": index + 1,
                        "rowBox": {"left": 0, "top": 0, "right": 10, "bottom": 10},
                        "bubbleBoxes": {
                            option: {"left": 0, "top": 0, "right": 5, "bottom": 5}
                            for option in "ABCD"
                        },
                    }
                    for index, _answer in enumerate("ABCDABCD")
                ],
                "groups": [],
            },
        ),
    )

    response = orchestrator.detect(
        OmrDetectRequest(
            imageUrl="https://example.com/sheet.png",
        ),
    )

    assert response.studentCode == "20224871"
    assert response.testId == "123"
    assert response.needsReview is False
    assert response.artifacts.annotatedImagePath is None
    assert [answer.detectedAnswer for answer in response.answers] == list("ABCDABCD")
    assert observed_templates["student"] == template
    assert observed_templates["answer"] == template


def test_detect_marks_review_when_student_code_is_missing(
    monkeypatch,
    synthetic_sheet_builder,
):
    image = synthetic_sheet_builder()
    orchestrator = OmrOrchestrator()
    template = orchestrator.template_registry.get("institute_60_4col")

    monkeypatch.setattr(orchestrator.image_loader, "load_from_url", lambda _url: image)
    monkeypatch.setattr(
        orchestrator,
        "_resolve_template",
        lambda _image, _template_name=None: template,
    )
    monkeypatch.setattr(
        orchestrator.student_id_detector,
        "detect_fields_with_debug",
        lambda _image, _template=None: ({"test_id": None}, {}),
    )
    monkeypatch.setattr(
        orchestrator.student_id_detector,
        "detect",
        lambda _image, _template=None: None,
    )
    monkeypatch.setattr(
        orchestrator.answer_detector,
        "detect_with_debug",
        lambda _image, _question_count, _template=None: (
            [
                OmrAnswerResponse(
                    questionNumber=index + 1,
                    detectedAnswer=answer,
                    needsReview=False,
                )
                for index, answer in enumerate("ABCDABCD")
            ],
            {
                "questions": [
                    {
                        "questionNumber": index + 1,
                        "rowBox": {"left": 0, "top": 0, "right": 10, "bottom": 10},
                        "bubbleBoxes": {
                            option: {"left": 0, "top": 0, "right": 5, "bottom": 5}
                            for option in "ABCD"
                        },
                    }
                    for index, _answer in enumerate("ABCDABCD")
                ],
                "groups": [],
            },
        ),
    )

    response = orchestrator.detect(
        OmrDetectRequest(
            imageUrl="https://example.com/sheet.png",
        ),
    )

    assert response.studentCode is None
    assert response.needsReview is True


def test_render_grade_overlay_updates_artifacts(tmp_path):
    orchestrator = OmrOrchestrator()
    processed_path = tmp_path / "processed.png"
    result_path = tmp_path / "result.json"
    cv2.imwrite(str(processed_path), synthetic_image())
    result_path.write_text(
        json.dumps(
            {
                "answers": [
                    {
                        "questionNumber": 1,
                        "detectedAnswer": "A",
                        "needsReview": False,
                        "reviewReason": None,
                        "rowBox": {"left": 0, "top": 0, "right": 10, "bottom": 10},
                        "bubbleBoxes": {
                            option: {"left": 0, "top": 0, "right": 5, "bottom": 5}
                            for option in "ABCD"
                        },
                    }
                ],
                "artifacts": {
                    "processedImagePath": str(processed_path),
                    "annotatedImagePath": None,
                    "warpOverlayPath": None,
                    "answerScoresPath": None,
                    "resultJsonPath": str(result_path),
                },
            }
        ),
        encoding="utf-8",
    )

    response = orchestrator.render_grade_overlay(
        OmrGradeOverlayRequest(
            resultJsonPath=str(result_path),
            answerKey=[{"questionNumber": 1, "correctAnswer": "A"}],
        )
    )

    assert response.artifacts.annotatedImagePath is not None
    updated_payload = json.loads(result_path.read_text(encoding="utf-8"))
    assert updated_payload["answers"][0]["correctAnswer"] == "A"
    assert updated_payload["answers"][0]["isCorrect"] is True


def test_process_keeps_legacy_two_step_flow(monkeypatch):
    orchestrator = OmrOrchestrator()
    monkeypatch.setattr(
        orchestrator,
        "detect",
        lambda _request: type(
            "DetectResponse",
            (),
            {
                "studentCode": "20224871",
                "testId": "123",
                "needsReview": False,
                "answers": [
                    OmrAnswerResponse(
                        questionNumber=1,
                        detectedAnswer="A",
                        needsReview=False,
                    )
                ],
                "artifacts": type(
                    "Artifacts",
                    (),
                    {"resultJsonPath": "/tmp/result.json"},
                )(),
            },
        )(),
    )
    monkeypatch.setattr(
        orchestrator,
        "render_grade_overlay",
        lambda _request: type(
            "OverlayResponse",
            (),
            {
                "artifacts": type(
                    "Artifacts",
                    (),
                    {
                        "processedImagePath": "/tmp/processed.png",
                        "annotatedImagePath": "/tmp/annotated.png",
                        "warpOverlayPath": "/tmp/warp.png",
                        "answerScoresPath": "/tmp/scores.json",
                        "resultJsonPath": "/tmp/result.json",
                    },
                )(),
            },
        )(),
    )

    response = orchestrator.process(
        OmrProcessRequest(
            imageUrl="https://example.com/sheet.png",
            answerKey=[{"questionNumber": 1, "correctAnswer": "A"}],
        )
    )

    assert response.answers[0].correctAnswer == "A"
    assert response.answers[0].isCorrect is True


def synthetic_image():
    import numpy as np

    return np.full((100, 100, 3), 255, dtype=np.uint8)
