import json
from pathlib import Path

import cv2
import numpy as np

from app.dataset.inventory import build_inventory, infer_layout_name
from app.dataset.sampling import sample_inventory


def _write_image(path: Path, width: int = 100, height: int = 200) -> None:
    image = np.full((height, width, 3), 255, dtype=np.uint8)
    cv2.imwrite(str(path), image)


def test_infer_layout_name_prefers_parent_directory(tmp_path):
    dataset_root = tmp_path / "dataset"
    image_dir = dataset_root / "layout_a" / "images"
    image_dir.mkdir(parents=True)
    image_path = image_dir / "sheet_001.png"
    _write_image(image_path)

    layout = infer_layout_name(dataset_root, image_path)

    assert layout == "layout_a"


def test_build_inventory_groups_images_by_layout_and_matches_labels(tmp_path):
    dataset_root = tmp_path / "dataset"
    image_dir = dataset_root / "layout_a" / "images"
    label_dir = dataset_root / "layout_a" / "labels"
    image_dir.mkdir(parents=True)
    label_dir.mkdir(parents=True)

    image_path = image_dir / "sheet_001.png"
    label_path = label_dir / "sheet_001.json"
    _write_image(image_path, width=320, height=640)
    label_path.write_text("{}", encoding="utf-8")

    inventory = build_inventory(dataset_root)

    assert inventory.image_count == 1
    assert inventory.label_file_count == 1
    assert inventory.layouts == {"layout_a": 1}
    assert inventory.images[0].label_path == str(label_path)
    assert inventory.images[0].width == 320
    assert inventory.images[0].height == 640


def test_sample_inventory_creates_subset_per_layout(tmp_path):
    dataset_root = tmp_path / "dataset"
    for layout in ("layout_a", "layout_b"):
        image_dir = dataset_root / layout / "images"
        label_dir = dataset_root / layout / "labels"
        image_dir.mkdir(parents=True)
        label_dir.mkdir(parents=True)
        for index in range(3):
            image_path = image_dir / f"sheet_{index}.png"
            label_path = label_dir / f"sheet_{index}.json"
            _write_image(image_path)
            label_path.write_text("{}", encoding="utf-8")

    inventory = build_inventory(dataset_root)
    inventory_path = tmp_path / "inventory.json"
    inventory_path.write_text(json.dumps(inventory.to_dict()), encoding="utf-8")

    output_dir = tmp_path / "subset"
    summary = sample_inventory(inventory_path, output_dir, per_layout=2, seed=7)

    assert summary["selected"] == {"layout_a": 2, "layout_b": 2}
    assert len(list((output_dir / "layout_a" / "images").glob("*.png"))) == 2
    assert len(list((output_dir / "layout_b" / "images").glob("*.png"))) == 2
