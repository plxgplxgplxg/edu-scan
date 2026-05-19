import numpy as np

from app.core.config import settings
from app.core.exceptions import InvalidImageError


class ImageValidator:
    def validate(self, image: np.ndarray) -> None:
        if image is None or image.size == 0:
            raise InvalidImageError()

        height, width = image.shape[:2]
        if (
            width < settings.min_image_width
            or height < settings.min_image_height
        ):
            raise InvalidImageError(
                "Image dimensions are too small for OMR processing",
            )
