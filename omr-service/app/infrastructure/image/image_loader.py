from urllib.error import URLError
from urllib.request import urlopen

import cv2
import numpy as np

from app.core.config import settings
from app.core.exceptions import ImageDownloadError, InvalidImageError


class ImageLoader:
    def load_from_url(self, image_url: str) -> np.ndarray:
        try:
            with urlopen(image_url, timeout=settings.request_timeout_seconds) as response:
                image_bytes = response.read()
        except URLError as error:
            raise ImageDownloadError(f"Failed to download image: {error.reason}") from error
        except Exception as error:
            raise ImageDownloadError(f"Failed to download image: {error}") from error

        if not image_bytes:
            raise InvalidImageError("Downloaded image is empty")

        image_array = np.frombuffer(image_bytes, dtype=np.uint8)
        image = cv2.imdecode(image_array, cv2.IMREAD_COLOR)

        if image is None:
            raise InvalidImageError()

        return image
