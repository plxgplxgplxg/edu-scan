import logging
import traceback
import grpc

from app.core.exceptions import ImageDownloadError, InvalidImageError, OmrServiceError
from app.domain.services.omr_orchestrator import OmrOrchestrator
from app.grpc.generated import omr_service_pb2, omr_service_pb2_grpc
from app.grpc.mappers import (
    detect_request_from_proto,
    grade_overlay_request_from_proto,
    grade_overlay_response_to_proto,
    process_request_from_proto,
    process_response_to_proto,
)


class OmrGrpcService(omr_service_pb2_grpc.OmrServiceServicer):
    def __init__(self, orchestrator: OmrOrchestrator | None = None) -> None:
        self.orchestrator = orchestrator or OmrOrchestrator()
        self._logger = logging.getLogger(self.__class__.__name__)

    def Detect(self, request, context):
        self._logger.info(
            "Detect start: imageUrl=%s templateName=%s",
            request.image_url,
            request.template_name or "auto",
        )
        result = self._call_with_boundary(
            context,
            lambda: process_response_to_proto(
                self.orchestrator.detect(detect_request_from_proto(request))
            ),
        )
        if result is not None:
            self._logger.info(
                "Detect done: studentCode=%s testId=%s needsReview=%s answers=%d",
                result.student_code or "null",
                result.test_id or "null",
                result.needs_review,
                len(result.answers),
            )
        return result

    def GradeOverlay(self, request, context):
        self._logger.info(
            "GradeOverlay start: resultJsonPath=%s answerKeyCount=%d",
            request.result_json_path,
            len(request.answer_key),
        )
        result = self._call_with_boundary(
            context,
            lambda: grade_overlay_response_to_proto(
                self.orchestrator.render_grade_overlay(
                    grade_overlay_request_from_proto(request)
                )
            ),
        )
        if result is not None:
            self._logger.info("GradeOverlay done")
        return result

    def Process(self, request, context):
        self._logger.info(
            "Process start: imageUrl=%s templateName=%s",
            request.image_url,
            request.template_name or "auto",
        )
        result = self._call_with_boundary(
            context,
            lambda: process_response_to_proto(
                self.orchestrator.process(process_request_from_proto(request))
            ),
        )
        if result is not None:
            self._logger.info("Process done")
        return result

    def _call_with_boundary(self, context, operation):
        try:
            return operation()
        except ImageDownloadError as exc:
            self._logger.warning("ImageDownloadError: %s", exc.message)
            context.abort(grpc.StatusCode.UNAVAILABLE, exc.message)
        except InvalidImageError as exc:
            self._logger.warning("InvalidImageError: %s", exc.message)
            context.abort(grpc.StatusCode.FAILED_PRECONDITION, exc.message)
        except ValueError as exc:
            self._logger.warning("ValueError: %s", str(exc))
            context.abort(grpc.StatusCode.INVALID_ARGUMENT, str(exc))
        except OmrServiceError as exc:
            self._logger.error("OmrServiceError: %s", exc.message)
            context.abort(grpc.StatusCode.INTERNAL, exc.message)
        except Exception as exc:
            self._logger.error("Unexpected error in gRPC handler: %s\n%s", str(exc), traceback.format_exc())
            context.abort(grpc.StatusCode.INTERNAL, f"Unexpected error: {str(exc)}")
