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

        id_region = self._normalize_digit_grid_region(id_region)

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

    def _normalize_digit_grid_region(self, image: np.ndarray) -> np.ndarray:
        if image.size == 0:
            return image

        height, width = image.shape[:2]
        contours, _ = cv2.findContours(
            image,
            cv2.RETR_EXTERNAL,
            cv2.CHAIN_APPROX_SIMPLE,
        )
        if not contours:
            return image

        candidates: list[tuple[int, int, int, int, int]] = []
        for contour in contours:
            x, y, w, h = cv2.boundingRect(contour)
            if w < width * 0.45 or h < height * 0.45:
                continue

            area = w * h
            candidates.append((area, x, y, w, h))

        if not candidates:
            return image

        _, x, y, w, h = max(candidates, key=lambda item: item[0])
        pad_x = max(1, int(w * 0.01))
        pad_y = max(1, int(h * 0.01))
        left = max(0, x - pad_x)
        top = max(0, y - pad_y)
        right = min(width, x + w + pad_x)
        bottom = min(height, y + h + pad_y)

        if right <= left or bottom <= top:
            return image

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

        height = cropped.shape[0]
        start_y = int(height * 0.04)
        end_y = int(height * 0.96)
        return cropped[start_y:end_y, :]

    def _slice_row(self, image: np.ndarray, index: int, total: int) -> np.ndarray:
        if image.size == 0:
            return image

        height = image.shape[0]
        start = int(height * index / total)
        end = int(height * (index + 1) / total)

        margin_y = max(1, int((end - start) * 0.18))
        return image[start + margin_y : max(start + margin_y + 1, end - margin_y), :]
