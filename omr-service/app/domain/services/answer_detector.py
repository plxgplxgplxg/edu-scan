import numpy as np

from app.domain.layouts.template_models import OmrLayoutTemplate
from app.domain.models.omr_response import OmrAnswerResponse
from app.domain.services.anchor_locator import AnchorLocator
from app.domain.services.bubble_analyzer import BubbleAnalyzer


class AnswerDetector:
    def __init__(
        self,
        options: str = "ABCD",
        region_start_ratio: float = 0.30,
        region_end_ratio: float = 0.95,
        fill_threshold: float = 0.10,
        confidence_margin: float = 0.08,
    ) -> None:
        self.options = options
        self.region_start_ratio = region_start_ratio
        self.region_end_ratio = region_end_ratio
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
        question_count: int,
        template: OmrLayoutTemplate | None = None,
    ) -> list[OmrAnswerResponse]:
        if template and template.answer_groups:
            return self._detect_from_groups(processed_image, question_count, template)

        answer_region = self._extract_answer_region(processed_image, template)
        if answer_region.size == 0:
            return self._empty_results(question_count)

        option_count = len(template.answer_options) if template else len(self.options)
        answer_options = "".join(template.answer_options) if template else self.options
        responses: list[OmrAnswerResponse] = []
        for question_index in range(question_count):
            row = self._slice_row(answer_region, question_index, question_count)
            fill_scores = [
                self.bubble_analyzer.score_bubble(
                    self._slice_column(row, option_index, option_count)
                )
                for option_index in range(option_count)
            ]
            best_index, needs_review = self.bubble_analyzer.classify_scores(fill_scores)

            responses.append(
                OmrAnswerResponse(
                    questionNumber=question_index + 1,
                    detectedAnswer=None if needs_review or best_index is None else answer_options[best_index],
                    needsReview=needs_review,
                ),
            )

        return responses

    def _detect_from_groups(
        self,
        processed_image: np.ndarray,
        question_count: int,
        template: OmrLayoutTemplate,
    ) -> list[OmrAnswerResponse]:
        responses_by_number: dict[int, OmrAnswerResponse] = {}
        option_count = len(template.answer_options)
        answer_options = "".join(template.answer_options)

        for group in template.answer_groups:
            group_region = self.anchor_locator.locate(processed_image, group.region)
            if group_region.size == 0:
                for question_number in range(group.question_start, group.question_end + 1):
                    responses_by_number[question_number] = OmrAnswerResponse(
                        questionNumber=question_number,
                        detectedAnswer=None,
                        needsReview=True,
                    )
                continue

            group_question_count = group.question_end - group.question_start + 1
            for offset in range(group_question_count):
                row = self._slice_row(group_region, offset, group_question_count)
                fill_scores = [
                    self.bubble_analyzer.score_bubble(
                        self._slice_column(row, option_index, option_count)
                    )
                    for option_index in range(option_count)
                ]
                best_index, needs_review = self.bubble_analyzer.classify_scores(fill_scores)

                question_number = group.question_start + offset
                responses_by_number[question_number] = OmrAnswerResponse(
                    questionNumber=question_number,
                    detectedAnswer=None if needs_review or best_index is None else answer_options[best_index],
                    needsReview=needs_review,
                )

        return [
            responses_by_number.get(
                question_number,
                OmrAnswerResponse(
                    questionNumber=question_number,
                    detectedAnswer=None,
                    needsReview=True,
                ),
            )
            for question_number in range(1, question_count + 1)
        ]

    def _extract_answer_region(
        self,
        processed_image: np.ndarray,
        template: OmrLayoutTemplate | None = None,
    ) -> np.ndarray:
        if template:
            return self._extract_region(processed_image, template.answer_region)

        height = processed_image.shape[0]
        top = int(height * self.region_start_ratio)
        bottom = int(height * self.region_end_ratio)
        return processed_image[top:bottom, :]

    def _extract_region(self, processed_image: np.ndarray, region) -> np.ndarray:
        image_height, image_width = processed_image.shape[:2]
        top = int(image_height * region.y)
        bottom = int(image_height * (region.y + region.height))
        left = int(image_width * region.x)
        right = int(image_width * (region.x + region.width))
        return processed_image[top:bottom, left:right]

    def _slice_row(self, image: np.ndarray, index: int, total: int) -> np.ndarray:
        if image.size == 0:
            return image

        height = image.shape[0]
        start = int(height * index / total)
        end = int(height * (index + 1) / total)

        margin_y = max(1, int((end - start) * 0.05))
        cropped = image[start + margin_y : max(start + margin_y + 1, end - margin_y), :]

        width = cropped.shape[1]
        start_x = int(width * 0.03)
        end_x = int(width * 0.97)
        return cropped[:, start_x:end_x]

    def _slice_column(self, image: np.ndarray, index: int, total: int) -> np.ndarray:
        if image.size == 0:
            return image

        width = image.shape[1]
        start = int(width * index / total)
        end = int(width * (index + 1) / total)

        margin_x = max(1, int((end - start) * 0.05))
        return image[:, start + margin_x : max(start + margin_x + 1, end - margin_x)]

    def _empty_results(self, question_count: int) -> list[OmrAnswerResponse]:
        return [
            OmrAnswerResponse(
                questionNumber=question_number,
                detectedAnswer=None,
                needsReview=True,
            )
            for question_number in range(1, question_count + 1)
        ]
