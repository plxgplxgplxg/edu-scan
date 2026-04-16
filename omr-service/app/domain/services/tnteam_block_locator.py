from __future__ import annotations

from dataclasses import dataclass

import cv2
import numpy as np


@dataclass(frozen=True)
class _ExpectedMarker:
    name: str
    center_x: int
    center_y: int
    row: str


class TnTeamBlockLocator:
    TEMPLATE_NAME = "tnteam_60q_4col_ad"

    _EXPECTED_MARKERS = (
        _ExpectedMarker("top_id_sep", 484, 815, "top"),
        _ExpectedMarker("top_group_1_sep", 830, 815, "top"),
        _ExpectedMarker("top_group_2_sep", 1175, 815, "top"),
        _ExpectedMarker("mid_id_sep", 484, 1519, "mid"),
        _ExpectedMarker("mid_group_1_sep", 830, 1519, "mid"),
        _ExpectedMarker("mid_group_2_sep", 1175, 1519, "mid"),
        _ExpectedMarker("footer_id_sep", 484, 2224, "footer"),
        _ExpectedMarker("footer_group_1_sep", 830, 2224, "footer"),
        _ExpectedMarker("footer_group_2_sep", 1175, 2224, "footer"),
    )

    _STANDARD_BOXES = {
        "roll_no": {"box": (109, 848, 462, 1478), "row": "top"},
        "test_id": {"box": (512, 848, 695, 1478), "row": "top"},
        "answer_group_1": {"box": (873, 855, 1078, 1478), "row": "top"},
        "answer_group_2": {"box": (1220, 855, 1424, 1478), "row": "top"},
        "answer_group_3": {"box": (181, 1559, 387, 2189), "row": "mid"},
        "answer_group_4": {"box": (527, 1559, 733, 2189), "row": "mid"},
        "answer_group_5": {"box": (873, 1559, 1078, 2189), "row": "mid"},
        "answer_group_6": {"box": (1220, 1559, 1425, 2189), "row": "mid"},
    }

    def __init__(
        self,
        search_radius: int = 64,
        min_marker_size: int = 20,
        max_marker_size: int = 70,
    ) -> None:
        self.search_radius = search_radius
        self.min_marker_size = min_marker_size
        self.max_marker_size = max_marker_size

    def locate_blocks(self, processed_image: np.ndarray) -> dict[str, tuple[int, int, int, int]]:
        debug = self.debug(processed_image)
        return {
            name: tuple(meta["box"])
            for name, meta in debug["blocks"].items()
        }

    def marker_count(self, processed_image: np.ndarray) -> int:
        return len(self.debug(processed_image)["markers"])

    def supports(self, processed_image: np.ndarray, min_markers: int = 5) -> bool:
        return self.marker_count(processed_image) >= min_markers

    def debug(self, processed_image: np.ndarray) -> dict[str, object]:
        markers = self._detect_markers(processed_image)
        row_shifts = self._compute_row_shifts(markers)

        blocks: dict[str, dict[str, object]] = {}
        for name, config in self._STANDARD_BOXES.items():
            row_shift = row_shifts.get(config["row"], (0, 0))
            blocks[name] = {
                "box": self._shift_box(config["box"], row_shift, processed_image.shape),
                "row": config["row"],
            }

        return {
            "markers": markers,
            "rowShifts": {
                row: {"dx": shift[0], "dy": shift[1]}
                for row, shift in row_shifts.items()
            },
            "blocks": blocks,
        }

    def _detect_markers(self, processed_image: np.ndarray) -> dict[str, dict[str, int]]:
        markers: dict[str, dict[str, int]] = {}
        for marker in self._EXPECTED_MARKERS:
            detected = self._find_marker_near(
                processed_image,
                marker.center_x,
                marker.center_y,
            )
            if detected is None:
                continue
            markers[marker.name] = {
                "x": detected[0],
                "y": detected[1],
                "row": marker.row,
            }
        return markers

    def _find_marker_near(
        self,
        processed_image: np.ndarray,
        expected_x: int,
        expected_y: int,
    ) -> tuple[int, int] | None:
        height, width = processed_image.shape[:2]
        left = max(0, expected_x - self.search_radius)
        top = max(0, expected_y - self.search_radius)
        right = min(width, expected_x + self.search_radius)
        bottom = min(height, expected_y + self.search_radius)
        window = processed_image[top:bottom, left:right]
        if window.size == 0:
            return None

        num_labels, _, stats, centroids = cv2.connectedComponentsWithStats(
            (window > 0).astype(np.uint8),
            connectivity=8,
        )
        best_match: tuple[float, int, int] | None = None
        for label in range(1, num_labels):
            component_left = stats[label, cv2.CC_STAT_LEFT]
            component_top = stats[label, cv2.CC_STAT_TOP]
            component_width = stats[label, cv2.CC_STAT_WIDTH]
            component_height = stats[label, cv2.CC_STAT_HEIGHT]
            component_area = stats[label, cv2.CC_STAT_AREA]

            if not (self.min_marker_size <= component_width <= self.max_marker_size):
                continue
            if not (self.min_marker_size <= component_height <= self.max_marker_size):
                continue

            aspect_ratio = component_width / max(component_height, 1)
            if not (0.8 <= aspect_ratio <= 1.25):
                continue

            fill_ratio = component_area / max(component_width * component_height, 1)
            if fill_ratio < 0.7:
                continue

            center_x = int(round(left + centroids[label][0]))
            center_y = int(round(top + centroids[label][1]))
            distance = float(np.hypot(center_x - expected_x, center_y - expected_y))
            if best_match is None or distance < best_match[0]:
                best_match = (distance, center_x, center_y)

        if best_match is None:
            return None

        return best_match[1], best_match[2]

    def _compute_row_shifts(
        self,
        markers: dict[str, dict[str, int]],
    ) -> dict[str, tuple[int, int]]:
        expected_by_name = {
            marker.name: marker
            for marker in self._EXPECTED_MARKERS
        }
        row_offsets: dict[str, list[tuple[int, int]]] = {
            "top": [],
            "mid": [],
            "footer": [],
        }
        for name, detected in markers.items():
            expected = expected_by_name[name]
            row_offsets[expected.row].append(
                (
                    detected["x"] - expected.center_x,
                    detected["y"] - expected.center_y,
                )
            )

        all_offsets = [offset for offsets in row_offsets.values() for offset in offsets]
        global_shift = self._median_shift(all_offsets)

        return {
            row: self._median_shift(offsets) if offsets else global_shift
            for row, offsets in row_offsets.items()
        }

    def _median_shift(self, offsets: list[tuple[int, int]]) -> tuple[int, int]:
        if not offsets:
            return 0, 0
        dx = int(round(float(np.median([offset[0] for offset in offsets]))))
        dy = int(round(float(np.median([offset[1] for offset in offsets]))))
        return dx, dy

    def _shift_box(
        self,
        box: tuple[int, int, int, int],
        shift: tuple[int, int],
        image_shape: tuple[int, ...],
    ) -> tuple[int, int, int, int]:
        height, width = image_shape[:2]
        dx, dy = shift
        left = max(0, min(width - 1, box[0] + dx))
        top = max(0, min(height - 1, box[1] + dy))
        right = max(left + 1, min(width, box[2] + dx))
        bottom = max(top + 1, min(height, box[3] + dy))
        return left, top, right, bottom
