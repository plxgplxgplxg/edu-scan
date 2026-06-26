import logging
import sys
from contextlib import asynccontextmanager

from fastapi import FastAPI

from app.core.config import settings
from app.core.exceptions import register_exception_handlers
from app.grpc.server import GrpcServerManager

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s %(message)s",
    stream=sys.stdout,
    force=True,
)


def create_app() -> FastAPI:
    grpc_server = GrpcServerManager() if settings.grpc_enabled else None

    @asynccontextmanager
    async def lifespan(_app: FastAPI):
        if grpc_server is not None:
            grpc_server.start()

        try:
            yield
        finally:
            if grpc_server is not None:
                grpc_server.stop()

    app = FastAPI(
        title="EduScan OMR Service",
        version="0.1.0",
        description="gRPC-backed OMR image processing service.",
        lifespan=lifespan,
    )

    register_exception_handlers(app)

    @app.get("/health")
    async def health_check():
        return {"status": "ok"}

    return app


app = create_app()
