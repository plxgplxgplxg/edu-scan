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

    def Detect(self, request, context):
        return self._call_with_boundary(
            context,
            lambda: process_response_to_proto(
                self.orchestrator.detect(detect_request_from_proto(request))
            ),
        )

    def GradeOverlay(self, request, context):
        return self._call_with_boundary(
            context,
            lambda: grade_overlay_response_to_proto(
                self.orchestrator.render_grade_overlay(
                    grade_overlay_request_from_proto(request)
                )
            ),
        )

    def Process(self, request, context):
        return self._call_with_boundary(
            context,
            lambda: process_response_to_proto(
                self.orchestrator.process(process_request_from_proto(request))
            ),
        )

    def _call_with_boundary(self, context, operation):
        try:
            return operation()
        except ImageDownloadError as exc:
            context.abort(grpc.StatusCode.UNAVAILABLE, exc.message)
        except InvalidImageError as exc:
            context.abort(grpc.StatusCode.FAILED_PRECONDITION, exc.message)
        except ValueError as exc:
            context.abort(grpc.StatusCode.INVALID_ARGUMENT, str(exc))
        except OmrServiceError as exc:
            context.abort(grpc.StatusCode.INTERNAL, exc.message)
