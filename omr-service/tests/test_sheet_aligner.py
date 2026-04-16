import cv2
import numpy as np

from app.domain.services.sheet_aligner import SheetAligner


def _build_warped_sheet() -> tuple[np.ndarray, np.ndarray]:
    sheet = np.full((800, 600, 3), 255, dtype=np.uint8)
    cv2.rectangle(sheet, (0, 0), (599, 799), (0, 0, 0), 8)
    cv2.circle(sheet, (150, 200), 30, (0, 0, 0), -1)
    cv2.rectangle(sheet, (300, 500), (450, 620), (0, 0, 0), -1)

    canvas = np.zeros((1200, 1000, 3), dtype=np.uint8)
    source = np.array(
        [[0, 0], [599, 0], [599, 799], [0, 799]],
        dtype=np.float32,
    )
    destination = np.array(
        [[160, 120], [860, 80], [900, 1030], [120, 1080]],
        dtype=np.float32,
    )
    matrix = cv2.getPerspectiveTransform(source, destination)
    warped = cv2.warpPerspective(sheet, matrix, (canvas.shape[1], canvas.shape[0]))

    return sheet, warped


def _build_marker_warped_sheet() -> tuple[np.ndarray, np.ndarray]:
    height, width = 2339, 1654
    sheet = np.full((height, width, 3), 255, dtype=np.uint8)
    marker_size = 44
    margin = 43

    for x, y in [
        (margin, margin),
        (width - margin - marker_size, margin),
        (width - margin - marker_size, height - margin - marker_size),
        (margin, height - margin - marker_size),
    ]:
        cv2.rectangle(sheet, (x, y), (x + marker_size, y + marker_size), (0, 0, 0), -1)

    cv2.circle(sheet, (520, 980), 28, (0, 0, 0), -1)
    cv2.circle(sheet, (980, 1480), 28, (0, 0, 0), -1)

    canvas = np.full((2600, 1900, 3), 255, dtype=np.uint8)
    source = np.array(
        [[0, 0], [width - 1, 0], [width - 1, height - 1], [0, height - 1]],
        dtype=np.float32,
    )
    destination = np.array(
        [[220, 180], [1670, 110], [1720, 2440], [150, 2500]],
        dtype=np.float32,
    )
    matrix = cv2.getPerspectiveTransform(source, destination)
    warped = cv2.warpPerspective(sheet, matrix, (canvas.shape[1], canvas.shape[0]))

    return sheet, warped


def test_sheet_aligner_rectifies_perspective_warp():
    expected_sheet, warped = _build_warped_sheet()

    aligned = SheetAligner().align(warped)

    aligned_resized = cv2.resize(
        aligned,
        (expected_sheet.shape[1], expected_sheet.shape[0]),
        interpolation=cv2.INTER_LINEAR,
    )
    difference = cv2.absdiff(expected_sheet, aligned_resized)
    mean_difference = float(np.mean(difference))

    assert aligned.shape[0] > 0
    assert aligned.shape[1] > 0
    assert mean_difference < 35.0


def test_sheet_aligner_returns_original_when_no_sheet_contour():
    image = np.zeros((400, 400, 3), dtype=np.uint8)

    aligned = SheetAligner().align(image)

    assert np.array_equal(aligned, image)


def test_sheet_aligner_rectifies_marker_based_sheet():
    expected_sheet, warped = _build_marker_warped_sheet()

    aligned = SheetAligner().align(warped)

    difference = cv2.absdiff(expected_sheet, aligned)
    mean_difference = float(np.mean(difference))

    assert aligned.shape == expected_sheet.shape
    assert mean_difference < 40.0
