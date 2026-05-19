from __future__ import annotations

import cv2
import numpy as np


class GradingOverlayRenderer:
    CORRECT_COLOR = (34, 139, 34)
    WRONG_COLOR = (0, 0, 255)
    REVIEW_COLOR = (0, 215, 255)

    def render(
        self,
        aligned_image: np.ndarray,
        answers: list[dict[str, object]],
        show_correct_answer: bool = True,
    ) -> np.ndarray:
        overlay = aligned_image.copy()

        for answer in answers:
            bubble_boxes = answer.get("bubbleBoxes") or {}
            detected_answer = answer.get("detectedAnswer")
            correct_answer = answer.get("correctAnswer")
            review_reason = answer.get("reviewReason")
            needs_review = bool(answer.get("needsReview"))
            question_number = int(answer["questionNumber"])

            color = self._resolve_color(
                needs_review=needs_review,
                detected_answer=detected_answer,
                correct_answer=correct_answer,
            )
            label = self._build_label(question_number, correct_answer, review_reason)

            row_box = answer.get("rowBox")
            if row_box:
                self._draw_row_label(overlay, row_box, label, color)

            if detected_answer and detected_answer in bubble_boxes:
                self._fill_box(overlay, bubble_boxes[detected_answer], color)

            if (
                show_correct_answer
                and correct_answer
                and correct_answer in bubble_boxes
                and correct_answer != detected_answer
            ):
                self._outline_box(overlay, bubble_boxes[correct_answer], self.CORRECT_COLOR, 3)

        return overlay

    def _resolve_color(
        self,
        *,
        needs_review: bool,
        detected_answer: object,
        correct_answer: object,
    ) -> tuple[int, int, int]:
        if needs_review:
            return self.REVIEW_COLOR
        if detected_answer and correct_answer and detected_answer == correct_answer:
            return self.CORRECT_COLOR
        return self.WRONG_COLOR

    def _build_label(
        self,
        question_number: int,
        correct_answer: object,
        review_reason: object,
    ) -> str:
        label = f"Q{question_number}"
        if correct_answer:
            label += f" ({correct_answer})"
        if review_reason:
            label += f" {review_reason}"
        return label

    def _draw_row_label(
        self,
        image: np.ndarray,
        row_box: dict[str, int],
        label: str,
        color: tuple[int, int, int],
    ) -> None:
        left = int(row_box["left"])
        top = int(row_box["top"])
        right = int(row_box["right"])
        bottom = int(row_box["bottom"])
        cv2.rectangle(image, (left, top), (right, bottom), color, 1)
        cv2.putText(
            image,
            label,
            (left, max(18, top - 6)),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.45,
            color,
            1,
            cv2.LINE_AA,
        )

    def _fill_box(
        self,
        image: np.ndarray,
        box: dict[str, int],
        color: tuple[int, int, int],
    ) -> None:
        left = int(box["left"])
        top = int(box["top"])
        right = int(box["right"])
        bottom = int(box["bottom"])
        region = image[top:bottom, left:right]
        if region.size == 0:
            return
        tint = np.full(region.shape, color, dtype=np.uint8)
        blended = cv2.addWeighted(region, 0.45, tint, 0.55, 0)
        image[top:bottom, left:right] = blended
        cv2.rectangle(image, (left, top), (right, bottom), color, 2)

    def _outline_box(
        self,
        image: np.ndarray,
        box: dict[str, int],
        color: tuple[int, int, int],
        thickness: int,
    ) -> None:
        left = int(box["left"])
        top = int(box["top"])
        right = int(box["right"])
        bottom = int(box["bottom"])
        cv2.rectangle(image, (left, top), (right, bottom), color, thickness)
