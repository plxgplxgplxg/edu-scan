from fastapi import FastAPI

from app.api.endpoints.omr import router as omr_router
from app.core.exceptions import register_exception_handlers


def create_app() -> FastAPI:
    app = FastAPI(
        title="EduScan OMR Service",
        version="0.1.0",
        description="FastAPI service for OMR image processing.",
    )

    register_exception_handlers(app)
    app.include_router(omr_router)

    @app.get("/health")
    async def health_check():
        return {"status": "ok"}

    return app


app = create_app()
