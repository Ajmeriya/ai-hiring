"""HTTP routes for aptitude question generation and assignment."""

from fastapi import APIRouter, HTTPException

from models import AptitudeQuestionRequest, AptitudeQuestionResponse, HealthResponse
from services.aptitude_service import AptitudeQuestionService

router = APIRouter(prefix="/api/aptitude")
service = AptitudeQuestionService()


@router.get("/health", response_model=HealthResponse)
async def health() -> dict:
    return service.health()


@router.post("/questions/assign", response_model=AptitudeQuestionResponse)
async def assign_questions(request: AptitudeQuestionRequest) -> AptitudeQuestionResponse:
    try:
        return service.assign_questions(request)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Question assignment failed: {exc}") from exc
