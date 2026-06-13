from dataclasses import dataclass
import os


@dataclass(frozen=True)
class Settings:
    grpc_enabled: bool = os.getenv("OMR_GRPC_ENABLED", "true").lower() in {
        "1",
        "true",
        "yes",
        "on",
    }
    grpc_host: str = os.getenv("OMR_GRPC_HOST", "0.0.0.0")
    grpc_port: int = int(os.getenv("OMR_GRPC_PORT", "50051"))
    grpc_max_workers: int = int(os.getenv("OMR_GRPC_MAX_WORKERS", "4"))
    request_timeout_seconds: float = float(
        os.getenv("OMR_REQUEST_TIMEOUT_SECONDS", "10"),
    )
    min_image_width: int = int(os.getenv("OMR_MIN_IMAGE_WIDTH", "300"))
    min_image_height: int = int(os.getenv("OMR_MIN_IMAGE_HEIGHT", "300"))


settings = Settings()
