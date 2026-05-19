from fastapi import APIRouter

from app.domain.models.omr_request import (
    OmrDetectRequest,
    OmrGradeOverlayRequest,
    OmrProcessRequest,
)
from app.domain.models.omr_response import (
    OmrGradeOverlayResponse,
    OmrProcessResponse,
)
from app.domain.services.omr_orchestrator import OmrOrchestrator

router = APIRouter(tags=["omr"])
orchestrator = OmrOrchestrator()


@router.post("/detect", response_model=OmrProcessResponse)
async def detect_omr(request: OmrDetectRequest) -> OmrProcessResponse:
    return orchestrator.detect(request)


@router.post("/grade-overlay", response_model=OmrGradeOverlayResponse)
async def grade_overlay_omr(
    request: OmrGradeOverlayRequest,
) -> OmrGradeOverlayResponse:
    return orchestrator.render_grade_overlay(request)


@router.post("/process", response_model=OmrProcessResponse)
async def process_omr(request: OmrProcessRequest) -> OmrProcessResponse:
    return orchestrator.process(request)
