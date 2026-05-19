import cv2
import numpy as np

from app.domain.services.bubble_analyzer import BubbleAnalyzer


def _bubble_image(filled: bool = False, radius: int = 18, size: int = 64) -> np.ndarray:
    image = np.zeros((size, size), dtype=np.uint8)
    center = (size // 2, size // 2)
    cv2.circle(image, center, radius, 255, 2)
    if filled:
        cv2.circle(image, center, radius - 4, 255, -1)
    return image


def test_bubble_analyzer_scores_filled_bubble_higher_than_empty():
    analyzer = BubbleAnalyzer()

    empty_score = analyzer.score_bubble(_bubble_image(filled=False))
    filled_score = analyzer.score_bubble(_bubble_image(filled=True))

    assert filled_score > empty_score
    assert filled_score > analyzer.fill_threshold


def test_bubble_analyzer_marks_low_scores_for_review():
    analyzer = BubbleAnalyzer()

    best_index, needs_review = analyzer.classify_scores([0.02, 0.01, 0.03, 0.02])

    assert best_index is None
    assert needs_review is True


def test_bubble_analyzer_marks_close_scores_for_review():
    analyzer = BubbleAnalyzer()

    best_index, needs_review = analyzer.classify_scores([0.30, 0.28, 0.05, 0.03])

    assert best_index is None
    assert needs_review is True


def test_bubble_analyzer_uses_lower_threshold_for_true_multi_mark():
    analyzer = BubbleAnalyzer(marked_threshold=0.80, multi_marked_threshold=0.40)

    marked_indices = analyzer.detect_marked_indices([0.1142, 1.0, 0.0212, 0.7765])

    assert marked_indices == [1, 3]
