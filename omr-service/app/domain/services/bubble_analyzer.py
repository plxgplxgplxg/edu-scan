from __future__ import annotations

import cv2
import numpy as np


class BubbleAnalyzer:
    def __init__(
        self,
        mask_radius_ratio: float = 0.32,
        fill_threshold: float = 0.10,
        confidence_margin: float = 0.04,
        marked_threshold: float = 0.80,
        multi_marked_threshold: float = 0.40,
        min_corrected_fill_threshold: float = 0.08,
    ) -> None:
        self.mask_radius_ratio = mask_radius_ratio
        self.fill_threshold = fill_threshold
        self.confidence_margin = confidence_margin
        self.marked_threshold = marked_threshold
        self.multi_marked_threshold = multi_marked_threshold
        self.min_corrected_fill_threshold = min_corrected_fill_threshold

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

        marked_indices = self.detect_marked_indices(scores)
        if len(marked_indices) == 1:
            return marked_indices[0], False

        if len(marked_indices) > 1:
            return None, True

        return None, True

    def detect_marked_indices(self, scores: list[float]) -> list[int]:
        if not scores:
            return []

        normalized_scores, corrected_scores, _ = self.normalize_scores(scores)
        if max(corrected_scores, default=0.0) < self.min_corrected_fill_threshold:
            return []

        primary_indices = [
            index
            for index, normalized_score in enumerate(normalized_scores)
            if normalized_score >= self.marked_threshold
            and corrected_scores[index] >= self.min_corrected_fill_threshold
        ]
        if len(primary_indices) > 1:
            return primary_indices

        multi_indices = [
            index
            for index, normalized_score in enumerate(normalized_scores)
            if normalized_score > self.multi_marked_threshold
            and corrected_scores[index] >= self.min_corrected_fill_threshold
        ]
        if len(multi_indices) > 1:
            return multi_indices

        return primary_indices

    def normalize_scores(
        self,
        scores: list[float],
    ) -> tuple[list[float], list[float], float]:
        if not scores:
            return [], [], 0.0

        background_score = float(np.median(scores))
        corrected_scores = [
            max(0.0, float(score) - background_score)
            for score in scores
        ]
        best_corrected_score = max(corrected_scores, default=0.0)
        if best_corrected_score <= 0:
            normalized_scores = [0.0 for _ in corrected_scores]
        else:
            normalized_scores = [
                corrected_score / best_corrected_score
                for corrected_score in corrected_scores
            ]

        return normalized_scores, corrected_scores, background_score
