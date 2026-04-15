import numpy as np

from app.domain.layouts.template_models import OmrLayoutTemplate
from app.domain.services.anchor_locator import AnchorLocator
from app.domain.services.bubble_analyzer import BubbleAnalyzer


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
            fill_threshold=fill_threshold,
            confidence_margin=confidence_margin,
        )

    def detect(
        self,
        processed_image: np.ndarray,
        template: OmrLayoutTemplate | None = None,
    ) -> str | None:
        field_values = self.detect_fields(processed_image, template)
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
        if template and template.id_fields:
            return {
                field.name: self._detect_from_region(
                    self.anchor_locator.locate(processed_image, field.region),
                    field.code_length,
                    field.grid.rows,
                )
                for field in template.id_fields
            }

        id_region = self._extract_id_region(processed_image, template)
        return {
            "student_code": self._detect_from_region(
                id_region,
                template.student_id_length if template and template.student_id_length else self.code_length,
                template.student_id_grid.rows if template and template.student_id_grid else self.row_count,
            )
        }

    def _detect_from_region(
        self,
        id_region: np.ndarray,
        code_length: int,
        row_count: int,
    ) -> str | None:
        if id_region.size == 0:
            return None

        digits: list[str] = []
        for column_index in range(code_length):
            column = self._slice_column(id_region, column_index, code_length)
            fill_scores = [
                self.bubble_analyzer.score_bubble(
                    self._slice_row(column, row_index, row_count)
                )
                for row_index in range(row_count)
            ]
            best_row, needs_review = self.bubble_analyzer.classify_scores(fill_scores)
            if needs_review or best_row is None:
                return None

            digits.append(str(best_row))

        return "".join(digits)

    def _extract_id_region(
        self,
        processed_image: np.ndarray,
        template: OmrLayoutTemplate | None = None,
    ) -> np.ndarray:
        if template and template.student_id_region:
            return self._extract_region(processed_image, template.student_id_region)

        height = processed_image.shape[0]
        top = int(height * 0.05)
        bottom = int(height * self.region_height_ratio)
        return processed_image[top:bottom, :]

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
