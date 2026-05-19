from __future__ import annotations

import cv2
import numpy as np


class AnchorLocator:
    def __init__(
        self,
        search_padding_ratio: float = 0.04,
        min_component_area_ratio: float = 0.0005,
    ) -> None:
        self.search_padding_ratio = search_padding_ratio
        self.min_component_area_ratio = min_component_area_ratio

    def locate(
        self,
        processed_image: np.ndarray,
        region,
    ) -> np.ndarray:
        static_crop = self._extract_region(processed_image, region)
        search_crop, search_bounds = self._extract_search_window(processed_image, region)
        if search_crop.size == 0:
            return static_crop

        refined_bounds = self._find_foreground_bounds(search_crop)
        if refined_bounds is None:
            return static_crop

        return self._shift_static_region_to_anchor(
            processed_image,
            region,
            refined_bounds,
            search_bounds,
        )

    def _extract_search_window(
        self,
        processed_image: np.ndarray,
        region,
    ) -> tuple[np.ndarray, tuple[int, int, int, int]]:
        image_height, image_width = processed_image.shape[:2]
        pad_x = region.width * self.search_padding_ratio
        pad_y = region.height * self.search_padding_ratio

        left = int(image_width * max(0.0, region.x - pad_x))
        top = int(image_height * max(0.0, region.y - pad_y))
        right = int(image_width * min(1.0, region.x + region.width + pad_x))
        bottom = int(image_height * min(1.0, region.y + region.height + pad_y))

        return processed_image[top:bottom, left:right], (left, top, right, bottom)

    def _extract_region(
        self,
        processed_image: np.ndarray,
        region,
    ) -> np.ndarray:
        image_height, image_width = processed_image.shape[:2]
        left = int(image_width * region.x)
        top = int(image_height * region.y)
        right = int(image_width * (region.x + region.width))
        bottom = int(image_height * (region.y + region.height))
        return processed_image[top:bottom, left:right]

    def _find_foreground_bounds(
        self,
        image: np.ndarray,
    ) -> tuple[int, int, int, int] | None:
        if image.size == 0:
            return None

        num_labels, labels, stats, _ = cv2.connectedComponentsWithStats(
            (image > 0).astype(np.uint8),
            connectivity=8,
        )
        if num_labels <= 1:
            return None

        image_area = image.shape[0] * image.shape[1]
        min_area = max(4, int(image_area * self.min_component_area_ratio))

        selected_boxes: list[tuple[int, int, int, int]] = []
        for label in range(1, num_labels):
            left = stats[label, cv2.CC_STAT_LEFT]
            top = stats[label, cv2.CC_STAT_TOP]
            width = stats[label, cv2.CC_STAT_WIDTH]
            height = stats[label, cv2.CC_STAT_HEIGHT]
            area = stats[label, cv2.CC_STAT_AREA]
            if area < min_area:
                continue
            selected_boxes.append((left, top, left + width, top + height))

        if not selected_boxes:
            return None

        left = min(box[0] for box in selected_boxes)
        top = min(box[1] for box in selected_boxes)
        right = max(box[2] for box in selected_boxes)
        bottom = max(box[3] for box in selected_boxes)

        pad_x = max(1, int((right - left) * 0.04))
        pad_y = max(1, int((bottom - top) * 0.04))

        return (
            max(0, left - pad_x),
            max(0, top - pad_y),
            min(image.shape[1], right + pad_x),
            min(image.shape[0], bottom + pad_y),
        )

    def _shift_static_region_to_anchor(
        self,
        processed_image: np.ndarray,
        region,
        refined_bounds: tuple[int, int, int, int],
        search_bounds: tuple[int, int, int, int],
    ) -> np.ndarray:
        image_height, image_width = processed_image.shape[:2]
        static_width = int(image_width * region.width)
        static_height = int(image_height * region.height)

        rel_left, rel_top, rel_right, rel_bottom = refined_bounds
        search_left, search_top, _, _ = search_bounds
        anchor_center_x = search_left + (rel_left + rel_right) // 2
        anchor_center_y = search_top + (rel_top + rel_bottom) // 2

        left = int(anchor_center_x - static_width / 2)
        top = int(anchor_center_y - static_height / 2)
        right = left + static_width
        bottom = top + static_height

        if left < 0:
            right -= left
            left = 0
        if top < 0:
            bottom -= top
            top = 0
        if right > image_width:
            shift = right - image_width
            left = max(0, left - shift)
            right = image_width
        if bottom > image_height:
            shift = bottom - image_height
            top = max(0, top - shift)
            bottom = image_height

        return processed_image[top:bottom, left:right]
