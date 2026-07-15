import cv2
import numpy as np
import sys
import os
import json

sys.path.insert(0, '/Users/plxg/workspace/edu-scan/omr-service')
from app.domain.services.student_id_detector import StudentIdDetector
from app.domain.layouts.template_models import OmrLayoutTemplate

detector = StudentIdDetector()

grid = np.zeros((630, 353), dtype=np.uint8)
grid[0:57, :] = 255
bubble_h = 573 / 10
bubble_w = 353 / 6
for r in range(10):
    for c in range(6):
        cy = 57 + int((r + 0.5) * bubble_h)
        cx = int((c + 0.5) * bubble_w)
        cv2.circle(grid, (cx, cy), 15, 255, 2)

marks = [0, 1, 1, 0, 7, 9]
for c, r in enumerate(marks):
    cy = 57 + int((r + 0.5) * bubble_h)
    cx = int((c + 0.5) * bubble_w)
    cv2.circle(grid, (cx, cy), 12, 255, -1)

grid = cv2.bitwise_not(grid)

region = grid[int(630/11):, :]

result, debug = detector._detect_from_region(region, 6, 10, capture_debug=True)
print("Detected:", result)
for d in debug:
    print(f"Col {d['columnIndex']}: {d['detectedDigit']} (needs review: {d['needsReview']})")
