from __future__ import annotations

import cv2
import numpy as np

from app.domain.layouts.template_models import OmrLayoutTemplate
from app.domain.layouts.template_registry import TemplateRegistry
from app.domain.services.tnteam_block_locator import TnTeamBlockLocator


class LayoutClassifier:
    def __init__(self, template_registry: TemplateRegistry | None = None) -> None:
        self.template_registry = template_registry or TemplateRegistry()
        self.tnteam_block_locator = TnTeamBlockLocator()

    def classify(
        self,
        processed_image: np.ndarray,
        question_count: int,
    ) -> OmrLayoutTemplate | None:
        if question_count == 60:
            if self.tnteam_block_locator.supports(processed_image):
                return self.template_registry.get(TnTeamBlockLocator.TEMPLATE_NAME)

            answer_columns = self._estimate_answer_columns(processed_image)
            top_blocks = self._estimate_top_blocks(processed_image)

            if top_blocks >= 4:
                return self.template_registry.get("tnteam_60q_4col_ad")

            if answer_columns >= 4 and top_blocks >= 2:
                return self.template_registry.get("institute_60_4col")

            if answer_columns == 3:
                return self.template_registry.get("generic_60q_3col")

        if question_count == 100:
            return self.template_registry.get("generic_100q_2col")

        return None

    def _estimate_answer_columns(self, processed_image: np.ndarray) -> int:
        answer_region = self._crop_ratio(processed_image, 0.05, 0.32, 0.90, 0.58)
        return self._count_content_clusters(answer_region, axis=1, smooth_window=9)

    def _estimate_top_blocks(self, processed_image: np.ndarray) -> int:
        id_region = self._crop_ratio(processed_image, 0.02, 0.08, 0.40, 0.18)
        return self._count_content_clusters(id_region, axis=1, smooth_window=5)

    def _crop_ratio(
        self,
        image: np.ndarray,
        x: float,
        y: float,
        width: float,
        height: float,
    ) -> np.ndarray:
        image_height, image_width = image.shape[:2]
        left = int(image_width * x)
        top = int(image_height * y)
        right = int(image_width * (x + width))
        bottom = int(image_height * (y + height))
        return image[top:bottom, left:right]

    def _count_content_clusters(
        self,
        image: np.ndarray,
        axis: int,
        smooth_window: int,
    ) -> int:
        if image.size == 0:
            return 0

        if axis != 1:
            raise ValueError("Only vertical cluster estimation is currently supported")

        projection = np.count_nonzero(image, axis=0)
        if projection.size == 0:
            return 0

        threshold = max(2, int(np.max(projection) * 0.08))
        active = projection > threshold
        active = self._smooth_signal(active, smooth_window)

        if not np.any(active):
            return 0

        clusters = 0
        in_cluster = False
        for value in active:
            if value and not in_cluster:
                clusters += 1
                in_cluster = True
            elif not value:
                in_cluster = False

        return clusters

    def _smooth_signal(self, signal: np.ndarray, window: int) -> np.ndarray:
        kernel = np.ones(window, dtype=np.uint8)
        smoothed = cv2.morphologyEx(
            signal.astype(np.uint8).reshape(1, -1),
            cv2.MORPH_CLOSE,
            kernel.reshape(1, -1),
        )
        return smoothed.reshape(-1).astype(bool)
