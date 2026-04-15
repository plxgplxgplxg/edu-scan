from app.domain.models.omr_request import OmrProcessRequest
from app.domain.models.omr_response import OmrAnswerResponse
from app.domain.services.omr_orchestrator import OmrOrchestrator


def test_orchestrator_returns_detected_values_without_review(
    monkeypatch,
    synthetic_sheet_builder,
):
    image = synthetic_sheet_builder(student_code="20224871", answers="ABCDABCD")
    orchestrator = OmrOrchestrator()
    template = orchestrator.template_registry.get("institute_60_4col")
    observed_templates = {"student": None, "answer": None}

    monkeypatch.setattr(orchestrator.image_loader, "load_from_url", lambda _url: image)
    monkeypatch.setattr(
        orchestrator.layout_classifier,
        "classify",
        lambda _image, _question_count: template,
    )
    monkeypatch.setattr(
        orchestrator.student_id_detector,
        "detect",
        lambda _image, _template=None: observed_templates.__setitem__("student", _template) or "20224871",
    )
    monkeypatch.setattr(
        orchestrator.answer_detector,
        "detect",
        lambda _image, _question_count, _template=None: observed_templates.__setitem__("answer", _template) or [
            OmrAnswerResponse(
                questionNumber=index + 1,
                detectedAnswer=answer,
                needsReview=False,
            )
            for index, answer in enumerate("ABCDABCD")
        ],
    )

    response = orchestrator.process(
        OmrProcessRequest(
            imageUrl="https://example.com/sheet.png",
            questionCount=8,
        ),
    )

    assert response.studentCode == "20224871"
    assert response.needsReview is False
    assert [answer.detectedAnswer for answer in response.answers] == list("ABCDABCD")
    assert observed_templates["student"] == template
    assert observed_templates["answer"] == template


def test_orchestrator_marks_review_when_student_code_is_missing(
    monkeypatch,
    synthetic_sheet_builder,
):
    image = synthetic_sheet_builder()
    orchestrator = OmrOrchestrator()
    template = orchestrator.template_registry.get("institute_60_4col")

    monkeypatch.setattr(orchestrator.image_loader, "load_from_url", lambda _url: image)
    monkeypatch.setattr(
        orchestrator.layout_classifier,
        "classify",
        lambda _image, _question_count: template,
    )
    monkeypatch.setattr(
        orchestrator.student_id_detector,
        "detect",
        lambda _image, _template=None: None,
    )

    response = orchestrator.process(
        OmrProcessRequest(
            imageUrl="https://example.com/sheet.png",
            questionCount=8,
        ),
    )

    assert response.studentCode is None
    assert response.needsReview is True
