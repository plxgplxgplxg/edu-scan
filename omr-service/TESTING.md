# OMR Service Testing

## Python Version

Use Python `3.11` for this service. Python `3.13` currently causes dependency install failures with the pinned scientific stack.

## Install

```bash
cd omr-service
/opt/homebrew/bin/python3.11 -m venv .venv
source .venv/bin/activate
python -m pip install --upgrade pip setuptools wheel
pip install -r requirements.txt
pip install -r requirements-dev.txt
```

## Run Service

```bash
uvicorn app.main:app --reload --port 8000
```

Healthcheck:

```bash
curl http://127.0.0.1:8000/health
```

## Run Unit Tests

```bash
pytest
```

## Inspect a Dataset

Generate a manifest with inferred layout groups:

```bash
python scripts/inspect_dataset.py /path/to/dataset --output artifacts/dataset-inventory.json
```

This writes:
- overall image count
- label file count
- inferred layout distribution
- per-image metadata including matched label file and image dimensions

## Sample a Smaller Subset

Create a reproducible subset grouped by layout:

```bash
python scripts/sample_subset.py artifacts/dataset-inventory.json artifacts/subset --per-layout 20 --seed 42
```

This copies a smaller dataset into:

```text
artifacts/subset/
  <layout>/
    images/
    labels/
```

and writes `artifacts/subset/subset-summary.json`.

## Debug a Single Local Image

Run the current pipeline on one local image and save debug crops:

```bash
PYTHONPATH=. python scripts/run_single_image_debug.py /absolute/path/to/image.jpg --question-count 60
```

This writes artifacts under:

```text
artifacts/debug/<image_stem>/
  processed.png
  student_id_crop.png
  answer_crop.png
  result.json
```

If you want a custom directory:

```bash
PYTHONPATH=. python scripts/run_single_image_debug.py /absolute/path/to/image.jpg --question-count 60 --output-dir artifacts/debug/manual-run
```

## Hoppscotch

1. Open Hoppscotch.
2. Create a `POST` request to `http://127.0.0.1:8000/process`.
3. Set `Content-Type: application/json`.
4. Use a publicly reachable image URL, for example a Cloudinary image URL.
5. Send this JSON body:

```json
{
  "imageUrl": "https://res.cloudinary.com/demo/image/upload/sample.jpg",
  "questionCount": 10
}
```

Expected response shape:

```json
{
  "studentCode": null,
  "needsReview": true,
  "answers": [
    {
      "questionNumber": 1,
      "detectedAnswer": null,
      "needsReview": true
    }
  ]
}
```

If the uploaded sheet matches the current synthetic-template assumptions, detected values may be non-null.

## NestJS Integration

Set the backend environment variable:

```env
OMR_SERVICE_URL=http://127.0.0.1:8000
```

Then start `backend-nestjs` and call the normal OMR upload endpoint. NestJS already posts this payload to FastAPI:

```json
{
  "imageUrl": "<cloudinary-url>",
  "questionCount": 40
}
```
