import asyncio

from app.api.endpoints import omr as omr_endpoint
from app.domain.models.omr_request import OmrProcessRequest
from app.domain.models.omr_response import OmrAnswerResponse, OmrProcessResponse


def test_process_endpoint_returns_expected_contract(monkeypatch):
    monkeypatch.setattr(
        omr_endpoint.orchestrator,
        "process",
        lambda _request: OmrProcessResponse(
            studentCode="20224871",
            needsReview=False,
            answers=[
                OmrAnswerResponse(
                    questionNumber=1,
                    detectedAnswer="A",
                    needsReview=False,
                ),
            ],
        ),
    )

    response = asyncio.run(
        omr_endpoint.process_omr(
            OmrProcessRequest(
                imageUrl="https://example.com/sheet.png",
                questionCount=1,
            )
        )
    )

    assert response.model_dump() == {
      "studentCode": "20224871",
      "needsReview": False,
      "answers": [
          {
              "questionNumber": 1,
              "detectedAnswer": "A",
              "needsReview": False,
          },
      ],
    }
