from __future__ import annotations

import argparse
import json
from pathlib import Path

import cv2

from app.domain.layouts.layout_classifier import LayoutClassifier
from app.domain.layouts.template_models import OmrLayoutTemplate
from app.domain.layouts.template_registry import TemplateRegistry
from app.domain.services.answer_detector import AnswerDetector
from app.domain.services.image_processor import ImageProcessor
from app.domain.services.student_id_detector import StudentIdDetector


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Run OMR detection on a single local image and save debug crops.",
    )
    parser.add_argument("image_path", help="Path to a local OMR sheet image")
    parser.add_argument(
        "--question-count",
        type=int,
        default=60,
        help="Expected number of questions in the sheet",
    )
    parser.add_argument(
        "--output-dir",
        default=None,
        help="Directory to write debug artifacts. Defaults to artifacts/debug/<image_stem>",
    )
    args = parser.parse_args()

    image_path = Path(args.image_path).expanduser().resolve()
    if not image_path.exists():
        raise SystemExit(f"Image not found: {image_path}")

    image = cv2.imread(str(image_path))
    if image is None:
        raise SystemExit(f"Could not decode image: {image_path}")

    output_dir = resolve_output_dir(image_path, args.output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    image_processor = ImageProcessor()
    template_registry = TemplateRegistry()
    layout_classifier = LayoutClassifier(template_registry)
    student_id_detector = StudentIdDetector()
    answer_detector = AnswerDetector()

    processed_image = image_processor.preprocess(image)
    template = layout_classifier.classify(processed_image, args.question_count)

    detected_id_fields = student_id_detector.detect_fields(processed_image, template)
    student_code = student_id_detector.detect(processed_image, template)
    answers = answer_detector.detect(
        processed_image,
        args.question_count,
        template,
    )
    needs_review = student_code is None or any(answer.needsReview for answer in answers)

    id_crop = student_id_detector._extract_id_region(processed_image, template)
    answer_crop = answer_detector._extract_answer_region(processed_image, template)
    refined_id_crops: dict[str, str] = {}
    refined_answer_group_crops: list[str] = []

    debug_payload = {
        "imagePath": str(image_path),
        "layout": template.name if template else None,
        "questionCount": args.question_count,
        "studentCode": student_code,
        "detectedIdFields": detected_id_fields,
        "needsReview": needs_review,
        "answers": [answer.model_dump() for answer in answers],
        "artifacts": {
            "processedImage": str(output_dir / "processed.png"),
            "studentIdCrop": str(output_dir / "student_id_crop.png"),
            "answerCrop": str(output_dir / "answer_crop.png"),
            "resultJson": str(output_dir / "result.json"),
            "refinedIdCrops": refined_id_crops,
            "refinedAnswerGroupCrops": refined_answer_group_crops,
        },
    }

    cv2.imwrite(str(output_dir / "processed.png"), processed_image)
    if id_crop.size > 0:
        cv2.imwrite(str(output_dir / "student_id_crop.png"), id_crop)
    if answer_crop.size > 0:
        cv2.imwrite(str(output_dir / "answer_crop.png"), answer_crop)
    if template:
        for field in template.id_fields:
            refined_crop = student_id_detector.anchor_locator.locate(processed_image, field.region)
            crop_path = output_dir / f"id_{field.name}.png"
            if refined_crop.size > 0:
                cv2.imwrite(str(crop_path), refined_crop)
                refined_id_crops[field.name] = str(crop_path)

        for index, group in enumerate(template.answer_groups, start=1):
            refined_crop = answer_detector.anchor_locator.locate(processed_image, group.region)
            crop_path = output_dir / f"answer_group_{index}.png"
            if refined_crop.size > 0:
                cv2.imwrite(str(crop_path), refined_crop)
                refined_answer_group_crops.append(str(crop_path))

    (output_dir / "result.json").write_text(
        json.dumps(debug_payload, indent=2),
        encoding="utf-8",
    )

    print(json.dumps(debug_payload, indent=2))


def resolve_output_dir(image_path: Path, output_dir: str | None) -> Path:
    if output_dir:
        return Path(output_dir).expanduser().resolve()

    return (
        Path.cwd()
        / "artifacts"
        / "debug"
        / image_path.stem
    )


if __name__ == "__main__":
    main()
