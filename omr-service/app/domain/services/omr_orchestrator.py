from __future__ import annotations

import json
import logging
from pathlib import Path
from uuid import uuid4

import cv2

from app.core.exceptions import InvalidImageError
from app.domain.layouts.layout_classifier import LayoutClassifier
from app.domain.layouts.template_registry import TemplateRegistry
from app.domain.models.omr_request import (
    OmrDetectRequest,
    OmrGradeOverlayRequest,
    OmrProcessRequest,
)
from app.domain.models.omr_response import (
    OmrAnswerResponse,
    OmrArtifactsResponse,
    OmrGradeOverlayResponse,
    OmrProcessResponse,
)
from app.domain.services.answer_detector import AnswerDetector
from app.domain.services.grading_overlay_renderer import GradingOverlayRenderer
from app.domain.services.image_processor import ImageProcessor
from app.domain.services.student_id_detector import StudentIdDetector
from app.infrastructure.image.image_loader import ImageLoader
from app.infrastructure.image.image_validator import ImageValidator
from app.domain.services.tnteam_block_locator import TnTeamBlockLocator


class OmrOrchestrator:
    def __init__(self) -> None:
        self._logger = logging.getLogger(self.__class__.__name__)
        self.image_loader = ImageLoader()
        self.image_validator = ImageValidator()
        self.image_processor = ImageProcessor()
        self.template_registry = TemplateRegistry()
        self.layout_classifier = LayoutClassifier(self.template_registry)
        self.student_id_detector = StudentIdDetector()
        self.answer_detector = AnswerDetector()
        self.grading_overlay_renderer = GradingOverlayRenderer()
        self._logger.info(
            "OmrOrchestrator initialized, templates=%d",
            len(self.template_registry.list_templates()),
        )

    def detect(self, request: OmrDetectRequest) -> OmrProcessResponse:
        self._logger.info("detect start: imageUrl=%s templateName=%s", request.imageUrl, request.templateName or "auto")

        self._logger.info("loading image from url")
        image = self.image_loader.load_from_url(str(request.imageUrl))
        self._logger.info("image loaded: shape=%s", image.shape if hasattr(image, "shape") else "unknown")
        self.image_validator.validate(image)

        self._logger.info("aligning and preprocessing image")
        aligned_image = self.image_processor.align(image)
        processed_image = self.image_processor.preprocess(image)
        if processed_image.size == 0:
            raise InvalidImageError("Image preprocessing failed")
        self._logger.info("image preprocessed: shape=%s", processed_image.shape)

        self._logger.info("resolving template")
        template = self._resolve_template(processed_image, request.templateName)
        question_count = template.question_count
        self._logger.info("template resolved: name=%s questions=%d", template.name, question_count)

        self._logger.info("detecting student id")
        detected_fields, _ = self.student_id_detector.detect_fields_with_debug(
            processed_image,
            template,
        )
        student_code = self.student_id_detector.detect(processed_image, template)
        self._logger.info("student id detected: studentCode=%s testId=%s", student_code, detected_fields.get("test_id"))

        self._logger.info("detecting answers")
        answers, answer_debug = self.answer_detector.detect_with_debug(
            processed_image,
            question_count,
            template,
        )
        self._logger.info("answers detected: count=%d", len(answers))

        enriched_questions = []
        answer_responses = []
        for answer, debug in zip(answers, answer_debug["questions"], strict=False):
            debug["detectedAnswer"] = answer.detectedAnswer
            debug["needsReview"] = answer.needsReview
            debug["reviewReason"] = answer.reviewReason
            enriched_questions.append(debug)
            answer_responses.append(
                answer.model_copy(
                    update={
                        "correctAnswer": None,
                        "isCorrect": None,
                    }
                )
            )

        needs_review = student_code is None or any(
            answer.needsReview for answer in answers
        )
        artifact_paths = self._write_detection_artifacts(
            aligned_image=aligned_image,
            processed_image=processed_image,
            template=template.name if template else None,
            student_code=student_code,
            test_id=detected_fields.get("test_id"),
            needs_review=needs_review,
            answers=enriched_questions,
            answer_debug=answer_debug,
        )

        return OmrProcessResponse(
            studentCode=student_code,
            testId=detected_fields.get("test_id"),
            needsReview=needs_review,
            answers=answer_responses,
            artifacts=OmrArtifactsResponse(**artifact_paths),
        )

    def render_grade_overlay(
        self,
        request: OmrGradeOverlayRequest,
    ) -> OmrGradeOverlayResponse:
        result_path = Path(request.resultJsonPath)
        payload = json.loads(result_path.read_text(encoding="utf-8"))
        artifacts = payload.get("artifacts", {})
        processed_image_path = artifacts.get("processedImagePath")
        if not processed_image_path:
            raise InvalidImageError("Detection result is missing processedImagePath")

        aligned_image = cv2.imread(str(processed_image_path))
        if aligned_image is None or aligned_image.size == 0:
            raise InvalidImageError("Unable to read processed image for overlay rendering")

        answer_key_map = {
            item.questionNumber: item.correctAnswer
            for item in request.answerKey
        }
        answers = []
        for answer in payload.get("answers", []):
            question_number = int(answer["questionNumber"])
            correct_answer = answer_key_map.get(question_number)
            detected_answer = answer.get("detectedAnswer")
            answers.append(
                {
                    **answer,
                    "correctAnswer": correct_answer,
                    "isCorrect": (
                        None
                        if detected_answer is None
                        else detected_answer == correct_answer
                    ),
                }
            )

        annotated_image = self.grading_overlay_renderer.render(aligned_image, answers)
        annotated_path = result_path.parent / "annotated.png"
        cv2.imwrite(str(annotated_path), annotated_image)

        payload["answers"] = answers
        payload["artifacts"]["annotatedImagePath"] = str(annotated_path)
        result_path.write_text(
            json.dumps(payload, indent=2),
            encoding="utf-8",
        )

        return OmrGradeOverlayResponse(
            artifacts=OmrArtifactsResponse(
                processedImagePath=artifacts.get("processedImagePath"),
                annotatedImagePath=str(annotated_path),
                warpOverlayPath=artifacts.get("warpOverlayPath"),
                answerScoresPath=artifacts.get("answerScoresPath"),
                resultJsonPath=str(result_path),
            )
        )

    def process(self, request: OmrProcessRequest) -> OmrProcessResponse:
        detect_response = self.detect(
            OmrDetectRequest(
                imageUrl=request.imageUrl,
                templateName=request.templateName,
            )
        )
        overlay_response = self.render_grade_overlay(
            OmrGradeOverlayRequest(
                resultJsonPath=detect_response.artifacts.resultJsonPath or "",
                answerKey=request.answerKey,
            )
        )

        answer_key_map = {
            item.questionNumber: item.correctAnswer
            for item in request.answerKey
        }
        graded_answers = [
            answer.model_copy(
                update={
                    "correctAnswer": answer_key_map.get(answer.questionNumber),
                    "isCorrect": (
                        None
                        if answer.detectedAnswer is None
                        else answer.detectedAnswer
                        == answer_key_map.get(answer.questionNumber)
                    ),
                }
            )
            for answer in detect_response.answers
        ]

        return OmrProcessResponse(
            studentCode=detect_response.studentCode,
            testId=detect_response.testId,
            needsReview=detect_response.needsReview,
            answers=graded_answers,
            artifacts=overlay_response.artifacts,
        )

    def _write_detection_artifacts(
        self,
        *,
        aligned_image,
        processed_image,
        template: str | None,
        student_code: str | None,
        test_id: str | None,
        needs_review: bool,
        answers: list[dict[str, object]],
        answer_debug: dict[str, object],
    ) -> dict[str, str | None]:
        output_dir = self._resolve_output_dir()
        processed_path = output_dir / "processed.png"
        thresholded_path = output_dir / "thresholded.png"
        warp_overlay_path = output_dir / "warp_overlay.png"
        answer_scores_path = output_dir / "answer_scores.json"
        result_json_path = output_dir / "result.json"

        located_blocks = (
            self.student_id_detector.tnteam_block_locator.debug(processed_image)
            if template == TnTeamBlockLocator.TEMPLATE_NAME
            else {"markers": {}, "rowShifts": {}, "blocks": {}}
        )

        warp_overlay = self._build_warp_overlay(aligned_image, located_blocks)

        cv2.imwrite(str(processed_path), aligned_image)
        cv2.imwrite(str(thresholded_path), processed_image)
        cv2.imwrite(str(warp_overlay_path), warp_overlay)
        answer_scores_path.write_text(
            json.dumps(answer_debug, indent=2),
            encoding="utf-8",
        )
        result_json_path.write_text(
            json.dumps(
                {
                    "layout": template,
                    "studentCode": student_code,
                    "testId": test_id,
                    "needsReview": needs_review,
                    "answers": answers,
                    "artifacts": {
                        "processedImagePath": str(processed_path),
                        "annotatedImagePath": None,
                        "warpOverlayPath": str(warp_overlay_path),
                        "answerScoresPath": str(answer_scores_path),
                        "resultJsonPath": str(result_json_path),
                    },
                },
                indent=2,
            ),
            encoding="utf-8",
        )

        return {
            "processedImagePath": str(processed_path),
            "annotatedImagePath": None,
            "warpOverlayPath": str(warp_overlay_path),
            "answerScoresPath": str(answer_scores_path),
            "resultJsonPath": str(result_json_path),
        }

    def _resolve_output_dir(self) -> Path:
        output_dir = (
            Path(__file__).resolve().parents[3]
            / "artifacts"
            / "generated"
            / uuid4().hex
        )
        output_dir.mkdir(parents=True, exist_ok=True)
        return output_dir

    def _build_warp_overlay(self, aligned_image, locator_debug: dict[str, object]):
        overlay = aligned_image.copy()
        for name, marker in locator_debug.get("markers", {}).items():
            center = (int(marker["x"]), int(marker["y"]))
            cv2.circle(overlay, center, 8, (0, 0, 255), 2)
            cv2.putText(
                overlay,
                name,
                (center[0] + 10, center[1] - 10),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.45,
                (0, 0, 255),
                1,
                cv2.LINE_AA,
            )

        for name, meta in locator_debug.get("blocks", {}).items():
            left, top, right, bottom = meta["box"]
            cv2.rectangle(overlay, (left, top), (right, bottom), (0, 160, 0), 2)
            cv2.putText(
                overlay,
                name,
                (left, max(24, top - 8)),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.5,
                (0, 160, 0),
                1,
                cv2.LINE_AA,
            )

        return overlay

    def _resolve_template(self, processed_image, template_name: str | None):
        if template_name:
            template = self.template_registry.get(template_name)
            if template is not None:
                return template

        question_counts = sorted(
            {template.question_count for template in self.template_registry.list_templates()}
        )
        for question_count in question_counts:
            template = self.layout_classifier.classify(processed_image, question_count)
            if template is not None:
                return template

        raise InvalidImageError("Unable to resolve OMR template for detection")
