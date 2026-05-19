from dataclasses import dataclass
import os


@dataclass(frozen=True)
class Settings:
    request_timeout_seconds: float = float(
        os.getenv("OMR_REQUEST_TIMEOUT_SECONDS", "10"),
    )
    min_image_width: int = int(os.getenv("OMR_MIN_IMAGE_WIDTH", "300"))
    min_image_height: int = int(os.getenv("OMR_MIN_IMAGE_HEIGHT", "300"))


settings = Settings()
