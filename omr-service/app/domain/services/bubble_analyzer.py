from __future__ import annotations

import cv2
import numpy as np


class BubbleAnalyzer:
    def __init__(
        self,
        mask_radius_ratio: float = 0.32,
        fill_threshold: float = 0.10,
        confidence_margin: float = 0.04,
    ) -> None:
        self.mask_radius_ratio = mask_radius_ratio
        self.fill_threshold = fill_threshold
        self.confidence_margin = confidence_margin

    def score_bubble(self, image: np.ndarray) -> float:
        if image.size == 0:
            return 0.0

        height, width = image.shape[:2]
        radius = max(2, int(min(height, width) * self.mask_radius_ratio))
        center = (width // 2, height // 2)

        mask = np.zeros((height, width), dtype=np.uint8)
        cv2.circle(mask, center, radius, 255, -1)

        masked = cv2.bitwise_and(image, image, mask=mask)
        active_pixels = np.count_nonzero(mask)
        if active_pixels == 0:
            return 0.0

        return float(np.count_nonzero(masked)) / float(active_pixels)

    def classify_scores(self, scores: list[float]) -> tuple[int | None, bool]:
        if not scores:
            return None, True

        best_index = int(np.argmax(scores))
        best_score = scores[best_index]
        sorted_scores = sorted(scores, reverse=True)
        second_score = sorted_scores[1] if len(sorted_scores) > 1 else 0.0

        needs_review = (
            best_score < self.fill_threshold
            or (best_score - second_score) < self.confidence_margin
        )
        if needs_review:
            return None, True

        return best_index, False
