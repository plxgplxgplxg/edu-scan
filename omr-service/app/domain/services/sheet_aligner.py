from __future__ import annotations

import cv2
import numpy as np


class SheetAligner:
    def __init__(
        self,
        canny_threshold_1: int = 50,
        canny_threshold_2: int = 150,
        min_area_ratio: float = 0.2,
        marker_target_width: int = 1654,
        marker_target_height: int = 2339,
        marker_margin: int = 43,
        marker_threshold: int = 90,
        marker_min_area_ratio: float = 0.00012,
        marker_max_area_ratio: float = 0.01,
    ) -> None:
        self.canny_threshold_1 = canny_threshold_1
        self.canny_threshold_2 = canny_threshold_2
        self.min_area_ratio = min_area_ratio
        self.marker_target_width = marker_target_width
        self.marker_target_height = marker_target_height
        self.marker_margin = marker_margin
        self.marker_threshold = marker_threshold
        self.marker_min_area_ratio = marker_min_area_ratio
        self.marker_max_area_ratio = marker_max_area_ratio

    def align(self, image: np.ndarray) -> np.ndarray:
        marker_quad = self._find_marker_quad(image)
        if marker_quad is not None:
            destination = self._marker_destination_points()
            matrix = cv2.getPerspectiveTransform(
                marker_quad.astype(np.float32),
                destination,
            )
            return cv2.warpPerspective(
                image,
                matrix,
                (self.marker_target_width, self.marker_target_height),
            )

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

    def _find_marker_quad(self, image: np.ndarray) -> np.ndarray | None:
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        _, thresholded = cv2.threshold(
            gray,
            self.marker_threshold,
            255,
            cv2.THRESH_BINARY_INV,
        )
        thresholded = cv2.morphologyEx(
            thresholded,
            cv2.MORPH_OPEN,
            np.ones((3, 3), dtype=np.uint8),
            iterations=1,
        )

        candidates = self._find_marker_candidates(thresholded)
        if len(candidates) < 4:
            return None

        ordered = self._select_corner_markers(candidates, image.shape[1], image.shape[0])
        if ordered is None:
            return None

        return ordered

    def _find_marker_candidates(self, thresholded: np.ndarray) -> list[tuple[float, float]]:
        num_labels, _, stats, centroids = cv2.connectedComponentsWithStats(
            thresholded,
            connectivity=8,
        )
        if num_labels <= 1:
            return []

        image_area = thresholded.shape[0] * thresholded.shape[1]
        min_area = image_area * self.marker_min_area_ratio
        max_area = image_area * self.marker_max_area_ratio

        candidates: list[tuple[float, float]] = []
        for label in range(1, num_labels):
            left = stats[label, cv2.CC_STAT_LEFT]
            top = stats[label, cv2.CC_STAT_TOP]
            width = stats[label, cv2.CC_STAT_WIDTH]
            height = stats[label, cv2.CC_STAT_HEIGHT]
            area = stats[label, cv2.CC_STAT_AREA]

            if area < min_area or area > max_area:
                continue

            aspect_ratio = width / max(height, 1)
            fill_ratio = area / max(width * height, 1)
            if not (0.7 <= aspect_ratio <= 1.3):
                continue
            if fill_ratio < 0.6:
                continue

            center_x, center_y = centroids[label]
            candidates.append((float(center_x), float(center_y)))

        return candidates

    def _select_corner_markers(
        self,
        candidates: list[tuple[float, float]],
        width: int,
        height: int,
    ) -> np.ndarray | None:
        corner_targets = np.array(
            [
                [0.0, 0.0],
                [float(width - 1), 0.0],
                [float(width - 1), float(height - 1)],
                [0.0, float(height - 1)],
            ],
            dtype=np.float32,
        )
        candidate_points = np.array(candidates, dtype=np.float32)
        chosen_indices: list[int] = []
        max_distance = 0.35 * np.hypot(width, height)

        for target in corner_targets:
            distances = np.linalg.norm(candidate_points - target, axis=1)
            ordered_indices = np.argsort(distances)
            selected_index = None
            for index in ordered_indices:
                if int(index) in chosen_indices:
                    continue
                if distances[index] > max_distance:
                    break
                selected_index = int(index)
                break
            if selected_index is None:
                return None
            chosen_indices.append(selected_index)

        return candidate_points[chosen_indices]

    def _marker_destination_points(self) -> np.ndarray:
        margin = float(self.marker_margin)
        width = float(self.marker_target_width - 1)
        height = float(self.marker_target_height - 1)
        return np.array(
            [
                [margin, margin],
                [width - margin, margin],
                [width - margin, height - margin],
                [margin, height - margin],
            ],
            dtype=np.float32,
        )

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
