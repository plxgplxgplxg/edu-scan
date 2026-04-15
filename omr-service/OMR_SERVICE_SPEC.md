# OMR Service Spec

## Metadata
- Service: `omr-service`
- Status: Draft
- Scope: Minimal FastAPI service for NestJS OMR integration

## Context
This service is the image-processing backend for EduScan OMR. NestJS uploads sheet images, then calls `POST /process` with the image URL and expected question count. The service is responsible for loading the image, validating it, running the OMR pipeline, and returning normalized detection results.

The first milestone is a stable API contract and runnable service skeleton. Real bubble detection and student code recognition are explicitly deferred until after the contract is integrated end-to-end with `backend-nestjs`.

## Functional Requirements
- `FR-1` The service MUST expose `POST /process`.
- `FR-2` The endpoint MUST accept `imageUrl` and `questionCount`.
- `FR-3` The service MUST download the image from `imageUrl`.
- `FR-4` The service MUST validate that the image can be decoded by OpenCV.
- `FR-5` The service MUST return exactly `questionCount` answer entries.
- `FR-6` The service MUST return a response shape compatible with NestJS `OmrClientService` and `GradingService`.
- `FR-7` The initial scaffold MUST mark all results as `needsReview=true` until real detection is implemented.

## Non-Functional Requirements
- `NFR-1` The service MUST fail fast for invalid input with `400`.
- `NFR-2` The service MUST return `422` for unreadable or invalid images.
- `NFR-3` The service SHOULD keep processing logic isolated from FastAPI route handlers.

## API Contract

### Request
```json
{
  "imageUrl": "https://example.com/sheet.jpg",
  "questionCount": 40
}
```

### Success Response
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

### Error Response
```json
{
  "message": "Image could not be decoded"
}
```

## Acceptance Criteria
- `AC-1` Given a valid image URL and positive `questionCount`, when `/process` is called, then the response contains `questionCount` answers.
- `AC-2` Given a missing or malformed request body, when `/process` is called, then FastAPI validation rejects the request.
- `AC-3` Given an unreachable URL, when `/process` is called, then the service returns a non-2xx error with a useful message.
- `AC-4` Given a non-image payload, when `/process` is called, then the service returns `422`.
- `AC-5` Given the current stub implementation, when `/process` succeeds, then `studentCode=null` and every answer has `needsReview=true`.

## Edge Cases
- `EC-1` `questionCount <= 0`
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
