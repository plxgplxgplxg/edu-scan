# OMR Service Spec

## Metadata
- Service: `omr-service`
- Status: Draft
- Scope: gRPC-first OMR service for NestJS OMR integration

## Context
This service is the image-processing backend for EduScan OMR. NestJS uploads sheet images, then calls the gRPC `Process` or `Detect` method with the image URL and expected template context. The service is responsible for loading the image, validating it, running the OMR pipeline, and returning normalized detection results.

The first milestone is a stable gRPC contract and runnable service skeleton. Real bubble detection and student code recognition are explicitly deferred until after the contract is integrated end-to-end with `backend-nestjs`.

## Functional Requirements
- `FR-1` The service MUST expose a gRPC contract for `Detect`, `GradeOverlay`, and `Process`.
- `FR-1b` The service MUST NOT expose public REST OMR endpoints for `detect`, `grade-overlay`, or `process`.
- `FR-2` The `Detect`/`Process` request MUST accept `imageUrl` and optional `templateName`.
- `FR-3` The service MUST download the image from `imageUrl`.
- `FR-4` The service MUST validate that the image can be decoded by OpenCV.
- `FR-5` The service MUST return answer entries compatible with the resolved template question count.
- `FR-6` The service MUST return a response shape compatible with NestJS `OmrClientService` and `GradingService`.
- `FR-7` The initial scaffold MUST mark all results as `needsReview=true` until real detection is implemented.

## Non-Functional Requirements
- `NFR-1` The service MUST fail fast for invalid input with an appropriate error status.
- `NFR-2` The service MUST return an invalid/precondition failure for unreadable or invalid images.
- `NFR-3` The service SHOULD keep processing logic isolated from FastAPI route handlers.

## gRPC Contract

Canonical proto path: `omr-service/proto/omr_service.proto`

Backend sync target: `backend-nestjs/src/modules/omr/proto/omr_service.proto`

Sync command: `python scripts/generate_grpc_stubs.py`

Service methods:
- `Detect(OmrDetectRequest) returns (OmrProcessResponse)`
- `GradeOverlay(OmrGradeOverlayRequest) returns (OmrGradeOverlayResponse)`
- `Process(OmrProcessRequest) returns (OmrProcessResponse)`

## Acceptance Criteria
- `AC-1` Given a valid image URL and resolvable template, when `Process` or `Detect` is called, then the response contains answer entries for that template.
- `AC-2` Given a missing or malformed request message, when the RPC is called, then the service returns an argument/validation error.
- `AC-3` Given an unreachable URL, when the RPC is called, then the service returns a non-OK gRPC status with a useful message.
- `AC-4` Given a non-image payload, when the RPC is called, then the service returns an invalid/precondition failure.
- `AC-5` Given the current stub implementation, when `Process` or `Detect` succeeds, then `studentCode=null` and every answer has `needsReview=true`.
- `AC-6` FastAPI only exposes operational routes such as `/health`; public REST OMR routes are disabled.

## Edge Cases
- `EC-1` Invalid or unsupported `templateName`
- `EC-2` URL responds but body is empty
- `EC-3` URL responds with non-image bytes
- `EC-4` Image decodes but dimensions are too small for OMR processing

## Out of Scope
- Real contour detection
- Perspective correction
- Student code bubble recognition
- Answer bubble recognition
- Batch processing and queueing
- Persistence or storage

## Transport Notes
- Canonical proto path: `omr-service/proto/omr_service.proto`
- Backend sync target: `backend-nestjs/src/modules/omr/proto/omr_service.proto`
- Sync command: `python scripts/generate_grpc_stubs.py`
- gRPC is the only OMR transport. FastAPI remains only for lifecycle and `/health`.
