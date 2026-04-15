from __future__ import annotations

from dataclasses import asdict, dataclass
import json
from pathlib import Path
import re
from typing import Any

import cv2


IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".bmp", ".tif", ".tiff"}
LABEL_EXTENSIONS = {".json", ".csv", ".txt"}


@dataclass(frozen=True)
class DatasetImageRecord:
    path: str
    relative_path: str
    layout: str
    width: int | None
    height: int | None
    label_path: str | None


@dataclass(frozen=True)
class DatasetInventory:
    dataset_root: str
    image_count: int
    label_file_count: int
    layouts: dict[str, int]
    images: list[DatasetImageRecord]

    def to_dict(self) -> dict[str, Any]:
        return {
            "dataset_root": self.dataset_root,
            "image_count": self.image_count,
            "label_file_count": self.label_file_count,
            "layouts": self.layouts,
            "images": [asdict(image) for image in self.images],
        }


def build_inventory(dataset_root: str | Path) -> DatasetInventory:
    root = Path(dataset_root).expanduser().resolve()
    image_paths = sorted(
        path for path in root.rglob("*") if path.is_file() and path.suffix.lower() in IMAGE_EXTENSIONS
    )
    label_paths = sorted(
        path for path in root.rglob("*") if path.is_file() and path.suffix.lower() in LABEL_EXTENSIONS
    )

    label_lookup = _index_labels(label_paths)
    images: list[DatasetImageRecord] = []
    layout_counts: dict[str, int] = {}

    for image_path in image_paths:
        relative_path = image_path.relative_to(root).as_posix()
        layout = infer_layout_name(root, image_path)
        width, height = read_image_size(image_path)
        label_path = match_label_path(image_path, label_lookup)

        images.append(
            DatasetImageRecord(
                path=str(image_path),
                relative_path=relative_path,
                layout=layout,
                width=width,
                height=height,
                label_path=str(label_path) if label_path else None,
            )
        )
        layout_counts[layout] = layout_counts.get(layout, 0) + 1

    return DatasetInventory(
        dataset_root=str(root),
        image_count=len(image_paths),
        label_file_count=len(label_paths),
        layouts=dict(sorted(layout_counts.items())),
        images=images,
    )


def write_inventory_json(inventory: DatasetInventory, output_path: str | Path) -> None:
    output = Path(output_path)
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(inventory.to_dict(), indent=2), encoding="utf-8")


def infer_layout_name(dataset_root: Path, image_path: Path) -> str:
    relative_parts = image_path.relative_to(dataset_root).parts[:-1]
    for part in reversed(relative_parts):
        normalized = _normalize_name(part)
        if normalized and normalized not in {"images", "image", "train", "valid", "test"}:
            return normalized

    stem = _normalize_name(image_path.stem)
    match = re.match(r"([a-z]+[_-]?\d+)", stem)
    if match:
        return _normalize_name(match.group(1))

    return "unknown"


def read_image_size(image_path: Path) -> tuple[int | None, int | None]:
    image = cv2.imread(str(image_path))
    if image is None:
        return None, None

    height, width = image.shape[:2]
    return width, height


def match_label_path(image_path: Path, label_lookup: dict[str, Path]) -> Path | None:
    image_stem = _normalize_name(image_path.stem)
    return label_lookup.get(image_stem)


def _index_labels(label_paths: list[Path]) -> dict[str, Path]:
    lookup: dict[str, Path] = {}
    for label_path in label_paths:
        lookup.setdefault(_normalize_name(label_path.stem), label_path)
    return lookup


def _normalize_name(value: str) -> str:
    normalized = re.sub(r"[^a-zA-Z0-9]+", "_", value.strip().lower())
    return normalized.strip("_")
