from __future__ import annotations

import argparse
from pathlib import Path

from app.dataset.inventory import build_inventory, write_inventory_json


def main() -> None:
    parser = argparse.ArgumentParser(description="Inspect an OMR dataset and build an inventory manifest.")
    parser.add_argument("dataset_root", help="Path to the dataset root directory")
    parser.add_argument(
        "--output",
        default="dataset-inventory.json",
        help="Output JSON path for the generated inventory manifest",
    )
    args = parser.parse_args()

    inventory = build_inventory(args.dataset_root)
    output_path = Path(args.output)
    write_inventory_json(inventory, output_path)

    print(f"Dataset root: {inventory.dataset_root}")
    print(f"Images: {inventory.image_count}")
    print(f"Label files: {inventory.label_file_count}")
    print("Layouts:")
    for layout, count in inventory.layouts.items():
        print(f"  - {layout}: {count}")
    print(f"Inventory written to: {output_path.resolve()}")


if __name__ == "__main__":
    main()
