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

gRPC listens in parallel by default on `0.0.0.0:50051`. Override with:

```bash
export OMR_GRPC_PORT=50051
export OMR_GRPC_ENABLED=true
```

Regenerate Python stubs and sync the backend proto copy:

```bash
python scripts/generate_grpc_stubs.py
```

gRPC is the only OMR transport. The FastAPI app stays up for `/health` and to host the gRPC server lifecycle, but it no longer exposes `/detect`, `/grade-overlay`, or `/process`.

## Run Unit Tests

```bash
.venv/bin/python -m pytest
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

## gRPC Smoke Check

Start the service, then verify the gRPC bootstrap imports cleanly:

```bash
python -c "from app.main import app; print(app.title)"
```

For RPC-level verification, rely on `pytest` coverage in `tests/test_grpc_service.py` or add a temporary client using the generated stub under `app/grpc/generated`.

## NestJS Integration

Set the backend environment variable:

```env
OMR_GRPC_URL=127.0.0.1:50051
```

Then start `backend-nestjs` with its gRPC client configuration. There is no REST fallback to `omr-service` in the target architecture for this migration path.
