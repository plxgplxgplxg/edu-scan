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
from app.domain.services.tnteam_block_locator import TnTeamBlockLocator


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
    parser.add_argument(
        "--template",
        default=None,
        help="Optional template name or alias to force during debug.",
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

    aligned_image = image_processor.sheet_aligner.align(image)
    processed_image = image_processor.preprocess(image)
    template = resolve_template(
        template_registry,
        layout_classifier,
        processed_image,
        args.question_count,
        args.template,
    )

    detected_id_fields, id_debug = student_id_detector.detect_fields_with_debug(processed_image, template)
    student_code = student_id_detector.detect(processed_image, template)
    answers, answer_debug = answer_detector.detect_with_debug(
        processed_image,
        args.question_count,
        template,
    )
    needs_review = student_code is None or any(answer.needsReview for answer in answers)

    located_blocks = (
        student_id_detector.tnteam_block_locator.debug(processed_image)
        if template and template.name == TnTeamBlockLocator.TEMPLATE_NAME
        else {"markers": {}, "rowShifts": {}, "blocks": {}}
    )
    id_crop = student_id_detector._extract_id_region(processed_image, template)
    answer_crop = answer_detector._extract_answer_region(processed_image, template)
    refined_id_crops: dict[str, str] = {}
    refined_answer_group_crops: list[str] = []
    overlay_path = output_dir / "warp_overlay.png"
    score_path = output_dir / "answer_scores.json"

    debug_payload = {
        "imagePath": str(image_path),
        "layout": template.name if template else None,
        "questionCount": args.question_count,
        "studentCode": student_code,
        "detectedIdFields": detected_id_fields,
        "needsReview": needs_review,
        "answers": [answer.model_dump() for answer in answers],
        "markers": located_blocks["markers"],
        "rowShifts": located_blocks["rowShifts"],
        "idDebug": id_debug,
        "answerDebug": answer_debug,
        "artifacts": {
            "processedImage": str(output_dir / "processed.png"),
            "studentIdCrop": str(output_dir / "student_id_crop.png"),
            "testIdCrop": str(output_dir / "test_id_crop.png"),
            "answerCrop": str(output_dir / "answer_crop.png"),
            "warpOverlay": str(overlay_path),
            "answerScoresJson": str(score_path),
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
        block_boxes = {
            name: tuple(meta["box"])
            for name, meta in located_blocks["blocks"].items()
        }
        for field in template.id_fields:
            refined_crop = extract_debug_crop(
                processed_image,
                block_boxes.get(field.name),
                student_id_detector,
                field.region,
                template,
            )
            crop_path = output_dir / f"id_{field.name}.png"
            if refined_crop.size > 0:
                cv2.imwrite(str(crop_path), refined_crop)
                refined_id_crops[field.name] = str(crop_path)
                if field.name == "roll_no":
                    cv2.imwrite(str(output_dir / "student_id_crop.png"), refined_crop)
                if field.name == "test_id":
                    cv2.imwrite(str(output_dir / "test_id_crop.png"), refined_crop)

        for index, group in enumerate(template.answer_groups, start=1):
            refined_crop = extract_debug_crop(
                processed_image,
                block_boxes.get(f"answer_group_{index}"),
                answer_detector,
                group.region,
                template,
            )
            crop_path = output_dir / f"answer_group_{index}.png"
            if refined_crop.size > 0:
                cv2.imwrite(str(crop_path), refined_crop)
                refined_answer_group_crops.append(str(crop_path))

    overlay = build_overlay(aligned_image, located_blocks)
    cv2.imwrite(str(overlay_path), overlay)
    score_path.write_text(
        json.dumps(answer_debug, indent=2),
        encoding="utf-8",
    )

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


def resolve_template(
    template_registry: TemplateRegistry,
    layout_classifier: LayoutClassifier,
    processed_image,
    question_count: int,
    forced_template: str | None,
) -> OmrLayoutTemplate | None:
    if forced_template:
        return template_registry.get(forced_template)

    return layout_classifier.classify(processed_image, question_count)


def extract_debug_crop(
    processed_image,
    fixed_box: tuple[int, int, int, int] | None,
    detector,
    region,
    template: OmrLayoutTemplate,
):
    if fixed_box is not None:
        left, top, right, bottom = fixed_box
        return processed_image[top:bottom, left:right]

    if template.use_anchor_locator:
        return detector.anchor_locator.locate(processed_image, region)

    return detector._extract_region(processed_image, region)


def build_overlay(aligned_image, locator_debug: dict[str, object]):
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


if __name__ == "__main__":
    main()
