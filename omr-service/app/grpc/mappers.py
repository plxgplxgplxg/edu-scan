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
from app.grpc.generated import omr_service_pb2


def detect_request_from_proto(
    request: omr_service_pb2.OmrDetectRequest,
) -> OmrDetectRequest:
    return OmrDetectRequest(
        imageUrl=request.image_url,
        templateName=request.template_name if request.HasField("template_name") else None,
    )


def grade_overlay_request_from_proto(
    request: omr_service_pb2.OmrGradeOverlayRequest,
) -> OmrGradeOverlayRequest:
    return OmrGradeOverlayRequest(
        resultJsonPath=request.result_json_path,
        answerKey=[
            {
                "questionNumber": item.question_number,
                "correctAnswer": item.correct_answer,
            }
            for item in request.answer_key
        ],
    )


def process_request_from_proto(
    request: omr_service_pb2.OmrProcessRequest,
) -> OmrProcessRequest:
    return OmrProcessRequest(
        imageUrl=request.image_url,
        templateName=request.template_name if request.HasField("template_name") else None,
        answerKey=[
            {
                "questionNumber": item.question_number,
                "correctAnswer": item.correct_answer,
            }
            for item in request.answer_key
        ],
    )


def process_response_to_proto(
    response: OmrProcessResponse,
) -> omr_service_pb2.OmrProcessResponse:
    proto_response = omr_service_pb2.OmrProcessResponse(
        needs_review=response.needsReview,
        answers=[answer_response_to_proto(answer) for answer in response.answers],
        artifacts=artifacts_response_to_proto(response.artifacts),
    )

    if response.studentCode is not None:
        proto_response.student_code = response.studentCode
    if response.testId is not None:
        proto_response.test_id = response.testId

    return proto_response


def grade_overlay_response_to_proto(
    response: OmrGradeOverlayResponse,
) -> omr_service_pb2.OmrGradeOverlayResponse:
    return omr_service_pb2.OmrGradeOverlayResponse(
        artifacts=artifacts_response_to_proto(response.artifacts),
    )


def answer_response_to_proto(
    answer: OmrAnswerResponse,
) -> omr_service_pb2.OmrAnswerResponse:
    proto_answer = omr_service_pb2.OmrAnswerResponse(
        question_number=answer.questionNumber,
        needs_review=answer.needsReview,
    )

    if answer.detectedAnswer is not None:
        proto_answer.detected_answer = answer.detectedAnswer
    if answer.correctAnswer is not None:
        proto_answer.correct_answer = answer.correctAnswer
    if answer.isCorrect is not None:
        proto_answer.is_correct = answer.isCorrect
    if answer.reviewReason is not None:
        proto_answer.review_reason = answer.reviewReason

    return proto_answer


def artifacts_response_to_proto(
    artifacts: OmrArtifactsResponse,
) -> omr_service_pb2.OmrArtifactsResponse:
    proto_artifacts = omr_service_pb2.OmrArtifactsResponse()

    if artifacts.processedImagePath is not None:
        proto_artifacts.processed_image_path = artifacts.processedImagePath
    if artifacts.annotatedImagePath is not None:
        proto_artifacts.annotated_image_path = artifacts.annotatedImagePath
    if artifacts.warpOverlayPath is not None:
        proto_artifacts.warp_overlay_path = artifacts.warpOverlayPath
    if artifacts.answerScoresPath is not None:
        proto_artifacts.answer_scores_path = artifacts.answerScoresPath
    if artifacts.resultJsonPath is not None:
        proto_artifacts.result_json_path = artifacts.resultJsonPath

    return proto_artifacts
