import cv2
import numpy as np
import sys
import os
import json

sys.path.insert(0, '/Users/plxg/workspace/edu-scan/omr-service')

from app.domain.services.student_id_detector import StudentIdDetector
from app.domain.layouts.template_models import OmrLayoutTemplate

with open('/Users/plxg/workspace/edu-scan/omr-service/templates/tnteam_60q_4col_ad.json', 'r') as f:
    template_data = json.load(f)

template = OmrLayoutTemplate.model_validate(template_data)

detector = StudentIdDetector()

image_path = "/Users/plxg/.gemini/antigravity-cli/brain/9e9c7b87-6a21-4bba-a84f-7802d7ca6ce3/.user_uploaded/uploaded_media_0_1784128261448.png"
if not os.path.exists(image_path):
    print("Image not found")
    sys.exit(1)

img = cv2.imread(image_path, cv2.IMREAD_GRAYSCALE)
if img is None:
    print("Failed to load image")
    sys.exit(1)

_, binary = cv2.threshold(img, 150, 255, cv2.THRESH_BINARY_INV)

result, debug = detector.detect_fields_with_debug(binary, template)
print("Detected SBD:", result.get("roll_no") if result else "None")
print("Debug info roll_no:", debug.get("roll_no", {}).get("columns", []) if debug else "None")
