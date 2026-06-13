from concurrent import futures
import logging

import grpc

from app.core.config import settings
from app.grpc.generated import omr_service_pb2_grpc
from app.grpc.service import OmrGrpcService


class GrpcServerManager:
    def __init__(self) -> None:
        self._logger = logging.getLogger(self.__class__.__name__)
        self._server = grpc.server(
            futures.ThreadPoolExecutor(max_workers=settings.grpc_max_workers),
        )
        omr_service_pb2_grpc.add_OmrServiceServicer_to_server(
            OmrGrpcService(),
            self._server,
        )
        self._address = f"{settings.grpc_host}:{settings.grpc_port}"
        self._started = False

    def start(self) -> None:
        if self._started:
            return

        self._server.add_insecure_port(self._address)
        self._server.start()
        self._started = True
        self._logger.info("OMR gRPC server started on %s", self._address)

    def stop(self, grace_seconds: float = 1.0) -> None:
        if not self._started:
            return

        self._server.stop(grace_seconds)
        self._started = False
        self._logger.info("OMR gRPC server stopped")
