from fastapi import APIRouter

from app.domain.models.omr_request import OmrProcessRequest
from app.domain.models.omr_response import OmrProcessResponse
from app.domain.services.omr_orchestrator import OmrOrchestrator

router = APIRouter(tags=["omr"])
orchestrator = OmrOrchestrator()


@router.post("/process", response_model=OmrProcessResponse)
async def process_omr(request: OmrProcessRequest) -> OmrProcessResponse:
    return orchestrator.process(request)
