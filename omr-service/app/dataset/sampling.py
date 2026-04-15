from __future__ import annotations

from collections import defaultdict
import json
from pathlib import Path
import random
import shutil
from typing import Any


def sample_inventory(
    inventory_path: str | Path,
    output_dir: str | Path,
    per_layout: int,
    seed: int = 42,
) -> dict[str, Any]:
    inventory_file = Path(inventory_path).expanduser().resolve()
    output_root = Path(output_dir).expanduser().resolve()
    payload = json.loads(inventory_file.read_text(encoding="utf-8"))

    rng = random.Random(seed)
    grouped: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for image in payload["images"]:
        grouped[image["layout"]].append(image)

    summary: dict[str, Any] = {
        "inventory_path": str(inventory_file),
        "output_dir": str(output_root),
        "per_layout": per_layout,
        "seed": seed,
        "selected": {},
    }

    output_root.mkdir(parents=True, exist_ok=True)

    for layout, images in sorted(grouped.items()):
        shuffled = list(images)
        rng.shuffle(shuffled)
        selected = shuffled[:per_layout]
        summary["selected"][layout] = len(selected)

        layout_dir = output_root / layout / "images"
        layout_dir.mkdir(parents=True, exist_ok=True)

        for image in selected:
            source_image = Path(image["path"])
            destination_image = layout_dir / source_image.name
            shutil.copy2(source_image, destination_image)

            if image.get("label_path"):
                source_label = Path(image["label_path"])
                label_dir = output_root / layout / "labels"
                label_dir.mkdir(parents=True, exist_ok=True)
                shutil.copy2(source_label, label_dir / source_label.name)

    summary_path = output_root / "subset-summary.json"
    summary_path.write_text(json.dumps(summary, indent=2), encoding="utf-8")
    return summary
