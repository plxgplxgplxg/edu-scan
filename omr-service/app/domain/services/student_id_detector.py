import cv2
import numpy as np

from app.domain.layouts.template_models import OmrLayoutTemplate
from app.domain.services.anchor_locator import AnchorLocator
from app.domain.services.bubble_analyzer import BubbleAnalyzer
from app.domain.services.tnteam_block_locator import TnTeamBlockLocator


class StudentIdDetector:
    def __init__(
        self,
        code_length: int = 8,
        row_count: int = 10,
        region_height_ratio: float = 0.25,
        fill_threshold: float = 0.005,
        confidence_margin: float = 0.005,
    ) -> None:
        self.code_length = code_length
        self.row_count = row_count
        self.region_height_ratio = region_height_ratio
        self.fill_threshold = fill_threshold
        self.confidence_margin = confidence_margin
        self.anchor_locator = AnchorLocator()
        self.bubble_analyzer = BubbleAnalyzer(
            mask_radius_ratio=0.40,
            fill_threshold=fill_threshold,
            confidence_margin=confidence_margin,
        )
        self.tnteam_block_locator = TnTeamBlockLocator()

    def detect(
        self,
        processed_image: np.ndarray,
        template: OmrLayoutTemplate | None = None,
    ) -> str | None:
        field_values, _ = self.detect_fields_with_debug(processed_image, template)
        if template and template.id_fields:
            for field in template.id_fields:
                if field.primary:
                    return field_values.get(field.name)
            return next(iter(field_values.values()), None)

        return field_values.get("student_code")

    def detect_fields(
        self,
        processed_image: np.ndarray,
        template: OmrLayoutTemplate | None = None,
    ) -> dict[str, str | None]:
        field_values, _ = self.detect_fields_with_debug(processed_image, template)
        return field_values

    def detect_fields_with_debug(
        self,
        processed_image: np.ndarray,
        template: OmrLayoutTemplate | None = None,
    ) -> tuple[dict[str, str | None], dict[str, dict[str, object]]]:
        if template and template.id_fields:
            located_boxes = self._resolve_tnteam_field_boxes(processed_image, template)
            results: dict[str, str | None] = {}
            debug: dict[str, dict[str, object]] = {}
            for field in template.id_fields:
                field_region = self._extract_field_region(
                    processed_image,
                    template,
                    field.name,
                    field.region,
                    located_boxes,
                )
                field_value, column_debug = self._detect_from_region(
                    field_region,
                    field.code_length,
                    field.grid.rows,
                    capture_debug=True,
                )
                results[field.name] = field_value
                debug[field.name] = {
                    "box": located_boxes.get(field.name),
                    "columns": column_debug,
                }
            return results, debug

        id_region = self._extract_id_region(processed_image, template)
        value, column_debug = self._detect_from_region(
            id_region,
            template.student_id_length if template and template.student_id_length else self.code_length,
            template.student_id_grid.rows if template and template.student_id_grid else self.row_count,
            capture_debug=True,
        )
        return {
            "student_code": value,
        }, {
            "student_code": {
                "box": None,
                "columns": column_debug,
            }
        }

    def _resolve_tnteam_field_boxes(
        self,
        processed_image: np.ndarray,
        template: OmrLayoutTemplate,
    ) -> dict[str, tuple[int, int, int, int]]:
        if template.name != TnTeamBlockLocator.TEMPLATE_NAME:
            return {}

        return self.tnteam_block_locator.locate_blocks(processed_image)

    def _extract_field_region(
        self,
        processed_image: np.ndarray,
        template: OmrLayoutTemplate,
        field_name: str,
        fallback_region,
        located_boxes: dict[str, tuple[int, int, int, int]],
    ) -> np.ndarray:
        if field_name in located_boxes:
            region = self._extract_box(processed_image, located_boxes[field_name])
        else:
            region = (
                self.anchor_locator.locate(processed_image, fallback_region)
                if template.use_anchor_locator
                else self._extract_region(processed_image, fallback_region)
            )

        if template and template.name == TnTeamBlockLocator.TEMPLATE_NAME and region.size > 0:
            h = region.shape[0]
            region = region[int(h / 11):, :]

        return region

    def _detect_from_region(
        self,
        id_region: np.ndarray,
        code_length: int,
        row_count: int,
        capture_debug: bool = False,
    ) -> str | tuple[str | None, list[dict[str, object]]] | None:
        if id_region.size == 0:
            return (None, []) if capture_debug else None

        id_region = self._normalize_digit_grid_region(
            id_region,
            code_length,
            row_count,
        )

        digits: list[str] = []
        debug_columns: list[dict[str, object]] = []
        has_invalid = False

        for column_index in range(code_length):
            column = self._slice_column(id_region, column_index, code_length)
            fill_scores = [
                self.bubble_analyzer.score_bubble(
                    self._slice_row(column, row_index, row_count)
                )
                for row_index in range(row_count)
            ]
            best_row, needs_review = self._classify_digit_scores(fill_scores)
            debug_columns.append(
                {
                    "columnIndex": column_index,
                    "scores": [round(float(score), 4) for score in fill_scores],
                    "detectedDigit": None if best_row is None else str(best_row),
                    "needsReview": needs_review,
                }
            )
            if best_row is not None:
                digits.append(str(best_row))
            else:
                digits.append("0")
                has_invalid = True

        detected_value = "".join(digits)
        if has_invalid and not digits:
            return (None, debug_columns) if capture_debug else None

        return (detected_value, debug_columns) if capture_debug else detected_value

    def _normalize_digit_grid_region(
        self,
        image: np.ndarray,
        code_length: int,
        row_count: int,
    ) -> np.ndarray:
        if image.size == 0:
            return image

        bubble_grid_box = self._find_bubble_grid_box(image, code_length, row_count)
        if bubble_grid_box is not None:
            return self._crop_box(image, bubble_grid_box)

        contour_grid_box = self._find_contour_grid_box(image)
        if contour_grid_box is not None:
            return self._crop_box(image, contour_grid_box)

        return image

    def _find_contour_grid_box(
        self,
        image: np.ndarray,
    ) -> tuple[int, int, int, int] | None:
        height, width = image.shape[:2]
        contours, _ = cv2.findContours(
            image,
            cv2.RETR_EXTERNAL,
            cv2.CHAIN_APPROX_SIMPLE,
        )
        if not contours:
            return None

        candidates: list[tuple[int, int, int, int, int]] = []
        for contour in contours:
            x, y, w, h = cv2.boundingRect(contour)
            if w < width * 0.45 or h < height * 0.45:
                continue

            area = w * h
            candidates.append((area, x, y, w, h))

        if not candidates:
            return None

        _, x, y, w, h = max(candidates, key=lambda item: item[0])
        pad_x = max(1, int(w * 0.01))
        pad_y = max(1, int(h * 0.01))
        left = max(0, x - pad_x)
        top = max(0, y - pad_y)
        right = min(width, x + w + pad_x)
        bottom = min(height, y + h + pad_y)

        if right <= left or bottom <= top:
            return None

        return left, top, right, bottom

    def _find_bubble_grid_box(
        self,
        image: np.ndarray,
        code_length: int,
        row_count: int,
    ) -> tuple[int, int, int, int] | None:
        components = self._find_bubble_like_components(image)
        if len(components) < code_length * max(2, row_count // 2):
            return None

        y_groups = self._cluster_components(
            components,
            axis="y",
            tolerance=self._component_tolerance(components, "h"),
        )
        row_candidates = [
            group
            for group in y_groups
            if len(group) >= max(2, code_length - 1)
        ]
        if len(row_candidates) < row_count:
            return None

        selected_rows = row_candidates[-row_count:]
        row_components = [
            component
            for group in selected_rows
            for component in group
        ]

        x_groups = self._cluster_components(
            row_components,
            axis="x",
            tolerance=self._component_tolerance(row_components, "w"),
        )
        column_candidates = [
            group
            for group in x_groups
            if len(group) >= max(2, row_count - 2)
        ]
        if len(column_candidates) < code_length:
            return None

        selected_columns = sorted(
            sorted(column_candidates, key=len, reverse=True)[:code_length],
            key=lambda group: self._group_center(group, "x"),
        )
        x_centers = [self._group_center(group, "x") for group in selected_columns]
        y_centers = [self._group_center(group, "y") for group in selected_rows]
        if len(x_centers) != code_length or len(y_centers) != row_count:
            return None

        x_spacing = self._median_spacing(x_centers)
        y_spacing = self._median_spacing(y_centers)
        if x_spacing <= 0 or y_spacing <= 0:
            return None

        height, width = image.shape[:2]
        left = max(0, int(round(min(x_centers) - x_spacing / 2)))
        right = min(width, int(round(max(x_centers) + x_spacing / 2)))
        top = max(0, int(round(min(y_centers) - y_spacing / 2)))
        bottom = min(height, int(round(max(y_centers) + y_spacing / 2)))

        if right <= left or bottom <= top:
            return None

        return left, top, right, bottom

    def _find_bubble_like_components(
        self,
        image: np.ndarray,
    ) -> list[dict[str, float]]:
        height, width = image.shape[:2]
        contours, _ = cv2.findContours(
            image,
            cv2.RETR_LIST,
            cv2.CHAIN_APPROX_SIMPLE,
        )
        components: list[dict[str, float]] = []
        for contour in contours:
            x, y, w, h = cv2.boundingRect(contour)
            if w < max(5, width * 0.025) or h < max(5, height * 0.025):
                continue
            if w > width * 0.30 or h > height * 0.18:
                continue

            aspect_ratio = w / max(h, 1)
            if not (0.55 <= aspect_ratio <= 1.75):
                continue

            perimeter = cv2.arcLength(contour, True)
            if perimeter <= 0:
                continue

            contour_area = cv2.contourArea(contour)
            circularity = 4 * np.pi * contour_area / (perimeter * perimeter)
            if circularity < 0.45:
                continue

            components.append(
                {
                    "x": float(x + w / 2),
                    "y": float(y + h / 2),
                    "w": float(w),
                    "h": float(h),
                }
            )

        return components

    def _cluster_components(
        self,
        components: list[dict[str, float]],
        *,
        axis: str,
        tolerance: float,
    ) -> list[list[dict[str, float]]]:
        if not components:
            return []

        groups: list[list[dict[str, float]]] = []
        for component in sorted(components, key=lambda item: item[axis]):
            if not groups:
                groups.append([component])
                continue

            current_group = groups[-1]
            if abs(component[axis] - self._group_center(current_group, axis)) <= tolerance:
                current_group.append(component)
            else:
                groups.append([component])

        return groups

    def _component_tolerance(
        self,
        components: list[dict[str, float]],
        key: str,
    ) -> float:
        if not components:
            return 4.0
        return max(4.0, float(np.median([component[key] for component in components])) * 0.75)

    def _group_center(
        self,
        components: list[dict[str, float]],
        axis: str,
    ) -> float:
        return float(np.median([component[axis] for component in components]))

    def _median_spacing(self, centers: list[float]) -> float:
        if len(centers) < 2:
            return 0.0
        ordered = sorted(centers)
        return float(np.median(np.diff(ordered)))

    def _crop_box(
        self,
        image: np.ndarray,
        box: tuple[int, int, int, int],
    ) -> np.ndarray:
        left, top, right, bottom = box
        return image[top:bottom, left:right]

    def _classify_digit_scores(self, scores: list[float]) -> tuple[int | None, bool]:
        if not scores:
            return None, True

        background_score = float(np.median(scores))
        corrected_scores = [max(0.0, float(score) - background_score) for score in scores]

        best_index = int(np.argmax(corrected_scores))
        best_score = corrected_scores[best_index]
        sorted_scores = sorted(corrected_scores, reverse=True)
        best_score = sorted_scores[0] if sorted_scores else 0.0
        second_score = sorted_scores[1] if len(sorted_scores) > 1 else 0.0

        needs_review = (
            best_score < 0.08
            or (best_score - second_score) < 0.05
        )
        return best_index, needs_review

    def _extract_box(
        self,
        processed_image: np.ndarray,
        box: tuple[int, int, int, int],
    ) -> np.ndarray:
        left, top, right, bottom = box
        return processed_image[top:bottom, left:right]

    def _extract_id_region(
        self,
        processed_image: np.ndarray,
        template: OmrLayoutTemplate | None = None,
    ) -> np.ndarray:
        region = None
        if template and template.name == TnTeamBlockLocator.TEMPLATE_NAME:
            located_boxes = self.tnteam_block_locator.locate_blocks(processed_image)
            if "roll_no" in located_boxes:
                region = self._extract_box(processed_image, located_boxes["roll_no"])

        if region is None:
            if template and template.student_id_region:
                region = self._extract_region(processed_image, template.student_id_region)
            else:
                height = processed_image.shape[0]
                top = int(height * 0.05)
                bottom = int(height * self.region_height_ratio)
                region = processed_image[top:bottom, :]

        if template and template.name == TnTeamBlockLocator.TEMPLATE_NAME and region is not None and region.size > 0:
            h = region.shape[0]
            region = region[int(h / 11):, :]

        return region

    def _extract_region(
        self,
        processed_image: np.ndarray,
        region,
    ) -> np.ndarray:
        height, width = processed_image.shape[:2]
        top = int(height * region.y)
        bottom = int(height * (region.y + region.height))
        left = int(width * region.x)
        right = int(width * (region.x + region.width))
        return processed_image[top:bottom, left:right]

    def _slice_column(
        self,
        image: np.ndarray,
        index: int,
        total: int,
    ) -> np.ndarray:
        if image.size == 0:
            return image

        width = image.shape[1]
        start = int(width * index / total)
        end = int(width * (index + 1) / total)

        margin_x = max(1, int((end - start) * 0.18))
        cropped = image[:, start + margin_x : max(start + margin_x + 1, end - margin_x)]

        return cropped

    def _slice_row(self, image: np.ndarray, index: int, total: int) -> np.ndarray:
        if image.size == 0:
            return image

        height = image.shape[0]
        start = int(height * index / total)
        end = int(height * (index + 1) / total)

        margin_y = max(1, int((end - start) * 0.18))
        return image[start + margin_y : max(start + margin_y + 1, end - margin_y), :]
