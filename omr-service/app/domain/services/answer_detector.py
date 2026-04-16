import numpy as np

from app.domain.layouts.template_models import OmrLayoutTemplate
from app.domain.models.omr_response import OmrAnswerResponse
from app.domain.services.anchor_locator import AnchorLocator
from app.domain.services.bubble_analyzer import BubbleAnalyzer
from app.domain.services.tnteam_block_locator import TnTeamBlockLocator


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
            marked_threshold=0.40,
            multi_marked_threshold=0.40,
            min_corrected_fill_threshold=0.08,
        )
        self.tnteam_block_locator = TnTeamBlockLocator()

    def detect(
        self,
        processed_image: np.ndarray,
        question_count: int,
        template: OmrLayoutTemplate | None = None,
    ) -> list[OmrAnswerResponse]:
        responses, _ = self.detect_with_debug(processed_image, question_count, template)
        return responses

    def detect_with_debug(
        self,
        processed_image: np.ndarray,
        question_count: int,
        template: OmrLayoutTemplate | None = None,
    ) -> tuple[list[OmrAnswerResponse], dict[str, object]]:
        if template and template.answer_groups:
            return self._detect_from_groups(processed_image, question_count, template)

        answer_region = self._extract_answer_region(processed_image, template)
        if answer_region.size == 0:
            return self._empty_results(question_count), {"questions": [], "groups": []}

        option_count = len(template.answer_options) if template else len(self.options)
        answer_options = "".join(template.answer_options) if template else self.options
        responses: list[OmrAnswerResponse] = []
        question_debug: list[dict[str, object]] = []
        for question_index in range(question_count):
            row = self._slice_row(answer_region, question_index, question_count)
            fill_scores = [
                self.bubble_analyzer.score_bubble(
                    self._slice_column(row, option_index, option_count)
                )
                for option_index in range(option_count)
            ]
            normalized_scores, corrected_scores, background_score = self.bubble_analyzer.normalize_scores(
                fill_scores
            )
            best_index, needs_review = self.bubble_analyzer.classify_scores(fill_scores)
            marked_indices = self.bubble_analyzer.detect_marked_indices(fill_scores)
            detected_answer = self._resolve_detected_answer(answer_options, best_index, marked_indices)

            responses.append(
                OmrAnswerResponse(
                    questionNumber=question_index + 1,
                    detectedAnswer=detected_answer,
                    needsReview=needs_review,
                ),
            )
            question_debug.append(
                {
                    "questionNumber": question_index + 1,
                    "scores": {
                        answer_options[option_index]: round(float(fill_scores[option_index]), 4)
                        for option_index in range(option_count)
                    },
                    "normalizedScores": {
                        answer_options[option_index]: round(float(normalized_scores[option_index]), 4)
                        for option_index in range(option_count)
                    },
                    "correctedScores": {
                        answer_options[option_index]: round(float(corrected_scores[option_index]), 4)
                        for option_index in range(option_count)
                    },
                    "backgroundScore": round(float(background_score), 4),
                    "detectedAnswer": detected_answer,
                    "needsReview": needs_review,
                }
            )

        return responses, {"questions": question_debug, "groups": []}

    def _detect_from_groups(
        self,
        processed_image: np.ndarray,
        question_count: int,
        template: OmrLayoutTemplate,
    ) -> tuple[list[OmrAnswerResponse], dict[str, object]]:
        responses_by_number: dict[int, OmrAnswerResponse] = {}
        option_count = len(template.answer_options)
        answer_options = "".join(template.answer_options)
        group_debug: list[dict[str, object]] = []
        question_debug: list[dict[str, object]] = []
        located_boxes = self._resolve_tnteam_group_boxes(processed_image, template)

        for index, group in enumerate(template.answer_groups, start=1):
            group_name = f"answer_group_{index}"
            group_region, box = self._extract_group_region(
                processed_image,
                template,
                group,
                group_name,
                located_boxes,
            )
            if group_region.size == 0:
                for question_number in range(group.question_start, group.question_end + 1):
                    responses_by_number[question_number] = OmrAnswerResponse(
                        questionNumber=question_number,
                        detectedAnswer=None,
                        needsReview=True,
                    )
                    question_debug.append(
                        {
                            "questionNumber": question_number,
                            "scores": {
                                option: 0.0
                                for option in answer_options
                            },
                            "detectedAnswer": None,
                            "needsReview": True,
                        }
                    )
                group_debug.append(
                    {
                        "name": group_name,
                        "questionStart": group.question_start,
                        "questionEnd": group.question_end,
                        "box": box,
                    }
                )
                continue

            group_question_count = group.question_end - group.question_start + 1
            group_debug.append(
                {
                    "name": group_name,
                    "questionStart": group.question_start,
                    "questionEnd": group.question_end,
                    "box": box,
                }
            )
            for offset in range(group_question_count):
                row = self._slice_row(group_region, offset, group_question_count)
                fill_scores = [
                    self.bubble_analyzer.score_bubble(
                        self._slice_column(row, option_index, option_count)
                    )
                    for option_index in range(option_count)
                ]
                normalized_scores, corrected_scores, background_score = self.bubble_analyzer.normalize_scores(
                    fill_scores
                )
                best_index, needs_review = self.bubble_analyzer.classify_scores(fill_scores)
                marked_indices = self.bubble_analyzer.detect_marked_indices(fill_scores)
                detected_answer = self._resolve_detected_answer(answer_options, best_index, marked_indices)

                question_number = group.question_start + offset
                responses_by_number[question_number] = OmrAnswerResponse(
                    questionNumber=question_number,
                    detectedAnswer=detected_answer,
                    needsReview=needs_review,
                )
                question_debug.append(
                    {
                        "questionNumber": question_number,
                        "scores": {
                            answer_options[option_index]: round(float(fill_scores[option_index]), 4)
                            for option_index in range(option_count)
                        },
                        "normalizedScores": {
                            answer_options[option_index]: round(float(normalized_scores[option_index]), 4)
                            for option_index in range(option_count)
                        },
                        "correctedScores": {
                            answer_options[option_index]: round(float(corrected_scores[option_index]), 4)
                            for option_index in range(option_count)
                        },
                        "backgroundScore": round(float(background_score), 4),
                        "detectedAnswer": detected_answer,
                        "needsReview": needs_review,
                    }
                )

        responses = [
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
        question_debug.sort(key=lambda item: int(item["questionNumber"]))
        return responses, {"questions": question_debug, "groups": group_debug}

    def _resolve_tnteam_group_boxes(
        self,
        processed_image: np.ndarray,
        template: OmrLayoutTemplate,
    ) -> dict[str, tuple[int, int, int, int]]:
        if template.name != TnTeamBlockLocator.TEMPLATE_NAME:
            return {}
        return self.tnteam_block_locator.locate_blocks(processed_image)

    def _extract_group_region(
        self,
        processed_image: np.ndarray,
        template: OmrLayoutTemplate,
        group,
        group_name: str,
        located_boxes: dict[str, tuple[int, int, int, int]],
    ) -> tuple[np.ndarray, tuple[int, int, int, int] | None]:
        if group_name in located_boxes:
            box = located_boxes[group_name]
            return self._extract_box(processed_image, box), box

        if template.use_anchor_locator:
            return self.anchor_locator.locate(processed_image, group.region), None

        return self._extract_region(processed_image, group.region), None

    def _extract_box(
        self,
        processed_image: np.ndarray,
        box: tuple[int, int, int, int],
    ) -> np.ndarray:
        left, top, right, bottom = box
        return processed_image[top:bottom, left:right]

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

    def _resolve_detected_answer(
        self,
        answer_options: str,
        best_index: int | None,
        marked_indices: list[int],
    ) -> str | None:
        if len(marked_indices) > 1:
            return "".join(answer_options[index] for index in marked_indices)
        if best_index is None:
            return None
        return answer_options[best_index]
