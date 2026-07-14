import pytest

from app.core.exceptions import InvalidImageError
from app.domain.models.omr_response import (
    OmrAnswerResponse,
    OmrArtifactsResponse,
    OmrProcessResponse,
)
from app.grpc.generated import omr_service_pb2
from app.grpc.mappers import process_response_to_proto
from app.grpc.service import OmrGrpcService


class FakeContext:
    def abort(self, code, details):
        raise RuntimeError((code, details))


def test_process_response_to_proto_keeps_optional_fields():
    response = OmrProcessResponse(
        studentCode="20224871",
        testId="123",
        needsReview=False,
        answers=[
            OmrAnswerResponse(
                questionNumber=1,
                detectedAnswer="A",
                needsReview=False,
            )
        ],
        artifacts=OmrArtifactsResponse(
            processedImagePath="/tmp/processed.png",
            warpOverlayPath="/tmp/warp_overlay.png",
            answerScoresPath="/tmp/answer_scores.json",
            resultJsonPath="/tmp/result.json",
        ),
    )

    proto_response = process_response_to_proto(response)

    assert proto_response.student_code == "20224871"
    assert proto_response.test_id == "123"
    assert proto_response.answers[0].detected_answer == "A"
    assert proto_response.answers[0].needs_review is False
    assert proto_response.artifacts.processed_image_path == "/tmp/processed.png"


def test_detect_grpc_service_returns_proto_payload(monkeypatch):
    service = OmrGrpcService()
    monkeypatch.setattr(
        service.orchestrator,
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
                )
            ],
            artifacts=OmrArtifactsResponse(
                processedImagePath="/tmp/processed.png",
                resultJsonPath="/tmp/result.json",
            ),
        ),
    )

    response = service.Detect(
        omr_service_pb2.OmrDetectRequest(image_url="https://example.com/sheet.png"),
        FakeContext(),
    )

    assert response.student_code == "20224871"
    assert response.answers[0].detected_answer == "A"
    assert response.artifacts.result_json_path == "/tmp/result.json"


def test_detect_grpc_service_maps_invalid_image_error(monkeypatch):
    service = OmrGrpcService()
    monkeypatch.setattr(
        service.orchestrator,
        "detect",
        lambda _request: (_ for _ in ()).throw(InvalidImageError("broken image")),
    )

    with pytest.raises(RuntimeError) as exc_info:
        service.Detect(
            omr_service_pb2.OmrDetectRequest(image_url="https://example.com/sheet.png"),
            FakeContext(),
        )

    assert "FAILED_PRECONDITION" in str(exc_info.value)
