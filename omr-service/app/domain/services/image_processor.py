import cv2
import numpy as np

from app.domain.services.sheet_aligner import SheetAligner


class ImageProcessor:
    def __init__(self) -> None:
        self.sheet_aligner = SheetAligner()

    def align(self, image: np.ndarray) -> np.ndarray:
        return self.sheet_aligner.align(image)

    def preprocess(self, image: np.ndarray) -> np.ndarray:
        aligned = self.align(image)
        gray = cv2.cvtColor(aligned, cv2.COLOR_BGR2GRAY)
        blurred = cv2.GaussianBlur(gray, (5, 5), 0)
        _, thresholded = cv2.threshold(
            blurred,
            0,
            255,
            cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU,
        )
        return thresholded
