from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse


class OmrServiceError(Exception):
    status_code = 500
    message = "OMR service error"

    def __init__(self, message: str | None = None):
        self.message = message or self.message
        super().__init__(self.message)


class InvalidImageError(OmrServiceError):
    status_code = 422
    message = "Image could not be decoded"


class ImageDownloadError(OmrServiceError):
    status_code = 400
    message = "Failed to download image"


def register_exception_handlers(app: FastAPI) -> None:
    @app.exception_handler(OmrServiceError)
    async def handle_omr_service_error(
        request: Request,
        exc: OmrServiceError,
    ) -> JSONResponse:
        return JSONResponse(
            status_code=exc.status_code,
            content={"message": exc.message},
        )
