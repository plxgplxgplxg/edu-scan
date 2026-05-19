import asyncio

from app.api.endpoints import omr as omr_endpoint
from app.domain.models.omr_request import (
    OmrDetectRequest,
    OmrGradeOverlayRequest,
    OmrProcessRequest,
)
from app.domain.models.omr_response import (
    OmrAnswerResponse,
    OmrArtifactsResponse,
    OmrGradeOverlayResponse,
    OmrProcessResponse,
)


def test_detect_endpoint_returns_expected_contract(monkeypatch):
    monkeypatch.setattr(
        omr_endpoint.orchestrator,
        "detect",
        lambda _request: OmrProcessResponse(
            studentCode="20224871",
            testId="123",
            needsReview=False,
            answers=[
                OmrAnswerResponse(
                    questionNumber=1,
                    detectedAnswer="A",
                    needsReview=False,
                ),
            ],
            artifacts=OmrArtifactsResponse(
                processedImagePath="/tmp/processed.png",
                warpOverlayPath="/tmp/warp_overlay.png",
                answerScoresPath="/tmp/answer_scores.json",
                resultJsonPath="/tmp/result.json",
            ),
        ),
    )

    response = asyncio.run(
        omr_endpoint.detect_omr(
            OmrDetectRequest(
                imageUrl="https://example.com/sheet.png",
            )
        )
    )

    assert response.model_dump() == {
        "studentCode": "20224871",
        "testId": "123",
        "needsReview": False,
        "answers": [
            {
                "questionNumber": 1,
                "detectedAnswer": "A",
                "correctAnswer": None,
                "isCorrect": None,
                "needsReview": False,
                "reviewReason": None,
            },
        ],
        "artifacts": {
            "processedImagePath": "/tmp/processed.png",
            "annotatedImagePath": None,
            "warpOverlayPath": "/tmp/warp_overlay.png",
            "answerScoresPath": "/tmp/answer_scores.json",
            "resultJsonPath": "/tmp/result.json",
        },
    }


def test_grade_overlay_endpoint_returns_expected_contract(monkeypatch, tmp_path):
    result_path = tmp_path / "result.json"
    result_path.write_text("{}", encoding="utf-8")
    monkeypatch.setattr(
        omr_endpoint.orchestrator,
        "render_grade_overlay",
        lambda _request: OmrGradeOverlayResponse(
            artifacts=OmrArtifactsResponse(
                processedImagePath="/tmp/processed.png",
                annotatedImagePath="/tmp/annotated.png",
                warpOverlayPath="/tmp/warp_overlay.png",
                answerScoresPath="/tmp/answer_scores.json",
                resultJsonPath=str(result_path),
            )
        ),
    )

    response = asyncio.run(
        omr_endpoint.grade_overlay_omr(
            OmrGradeOverlayRequest(
                resultJsonPath=str(result_path),
                answerKey=[
                    {
                        "questionNumber": 1,
                        "correctAnswer": "A",
                    }
                ],
            )
        )
    )

    assert response.model_dump() == {
        "artifacts": {
            "processedImagePath": "/tmp/processed.png",
            "annotatedImagePath": "/tmp/annotated.png",
            "warpOverlayPath": "/tmp/warp_overlay.png",
            "answerScoresPath": "/tmp/answer_scores.json",
            "resultJsonPath": str(result_path),
        }
    }


def test_process_endpoint_keeps_legacy_contract(monkeypatch):
    monkeypatch.setattr(
        omr_endpoint.orchestrator,
        "process",
        lambda _request: OmrProcessResponse(
            studentCode="20224871",
            testId="123",
            needsReview=False,
            answers=[
                OmrAnswerResponse(
                    questionNumber=1,
                    detectedAnswer="A",
                    correctAnswer="A",
                    isCorrect=True,
                    needsReview=False,
                ),
            ],
            artifacts=OmrArtifactsResponse(
                processedImagePath="/tmp/processed.png",
                annotatedImagePath="/tmp/annotated.png",
                warpOverlayPath="/tmp/warp_overlay.png",
                answerScoresPath="/tmp/answer_scores.json",
                resultJsonPath="/tmp/result.json",
            ),
        ),
    )

    response = asyncio.run(
        omr_endpoint.process_omr(
            OmrProcessRequest(
                imageUrl="https://example.com/sheet.png",
                answerKey=[
                    {
                        "questionNumber": 1,
                        "correctAnswer": "A",
                    }
                ],
            )
        )
    )

    assert response.answers[0].isCorrect is True
