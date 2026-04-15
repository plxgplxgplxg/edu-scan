from __future__ import annotations

import cv2
import numpy as np


class SheetAligner:
    def __init__(
        self,
        canny_threshold_1: int = 50,
        canny_threshold_2: int = 150,
        min_area_ratio: float = 0.2,
    ) -> None:
        self.canny_threshold_1 = canny_threshold_1
        self.canny_threshold_2 = canny_threshold_2
        self.min_area_ratio = min_area_ratio

    def align(self, image: np.ndarray) -> np.ndarray:
        contour = self._find_sheet_contour(image)
        if contour is None:
            return image

        ordered = self._order_points(contour.astype(np.float32))
        destination = self._destination_points(ordered)
        matrix = cv2.getPerspectiveTransform(ordered, destination)

        max_width = int(destination[1][0] - destination[0][0])
        max_height = int(destination[2][1] - destination[1][1])
        if max_width <= 0 or max_height <= 0:
            return image

        return cv2.warpPerspective(image, matrix, (max_width, max_height))

    def _find_sheet_contour(self, image: np.ndarray) -> np.ndarray | None:
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        blurred = cv2.GaussianBlur(gray, (5, 5), 0)
        edged = cv2.Canny(blurred, self.canny_threshold_1, self.canny_threshold_2)
        edged = cv2.dilate(edged, None, iterations=2)
        edged = cv2.erode(edged, None, iterations=1)

        contours, _ = cv2.findContours(edged, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        if not contours:
            return None

        image_area = image.shape[0] * image.shape[1]
        min_area = image_area * self.min_area_ratio

        for contour in sorted(contours, key=cv2.contourArea, reverse=True):
            area = cv2.contourArea(contour)
            if area < min_area:
                break

            perimeter = cv2.arcLength(contour, True)
            approximation = cv2.approxPolyDP(contour, 0.02 * perimeter, True)
            if len(approximation) == 4:
                return approximation.reshape(4, 2)

        return None

    def _order_points(self, points: np.ndarray) -> np.ndarray:
        sums = points.sum(axis=1)
        diffs = np.diff(points, axis=1).reshape(-1)

        top_left = points[np.argmin(sums)]
        bottom_right = points[np.argmax(sums)]
        top_right = points[np.argmin(diffs)]
        bottom_left = points[np.argmax(diffs)]

        return np.array([top_left, top_right, bottom_right, bottom_left], dtype=np.float32)

    def _destination_points(self, points: np.ndarray) -> np.ndarray:
        top_left, top_right, bottom_right, bottom_left = points
        width_top = np.linalg.norm(top_right - top_left)
        width_bottom = np.linalg.norm(bottom_right - bottom_left)
        max_width = max(int(width_top), int(width_bottom))

        height_right = np.linalg.norm(bottom_right - top_right)
        height_left = np.linalg.norm(bottom_left - top_left)
        max_height = max(int(height_right), int(height_left))

        return np.array(
            [
                [0, 0],
                [max_width - 1, 0],
                [max_width - 1, max_height - 1],
                [0, max_height - 1],
            ],
            dtype=np.float32,
        )
