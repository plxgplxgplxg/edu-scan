import cv2
import numpy as np

from app.domain.layouts.template_models import BoundingBoxRatio
from app.domain.services.anchor_locator import AnchorLocator


def test_anchor_locator_refines_region_to_foreground_block():
    image = np.zeros((400, 400), dtype=np.uint8)
    cv2.rectangle(image, (130, 120), (250, 280), 255, -1)
    region = BoundingBoxRatio(x=0.20, y=0.20, width=0.50, height=0.60)

    refined = AnchorLocator().locate(image, region)

    assert refined.shape == (
        int(image.shape[0] * region.height),
        int(image.shape[1] * region.width),
    )
    assert np.count_nonzero(refined) > 0


def test_anchor_locator_falls_back_when_region_has_no_foreground():
    image = np.zeros((200, 200), dtype=np.uint8)
    region = BoundingBoxRatio(x=0.10, y=0.10, width=0.30, height=0.30)

    refined = AnchorLocator().locate(image, region)

    assert refined.shape == (60, 60)
