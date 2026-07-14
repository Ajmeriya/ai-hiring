"""HTTP routes for DSA and SQL questions."""

from fastapi import APIRouter, HTTPException, Query

from models import DSAQuestionAssignRequest, DSAQuestionAssignResponse, HealthResponse
from services.question_service import DSAQuestionService

router = APIRouter(prefix="/api/dsa")
service = DSAQuestionService()


@router.get("/health", response_model=HealthResponse)
async def health() -> dict:
    return service.health()


@router.post("/questions/assign", response_model=DSAQuestionAssignResponse)
async def assign_questions(request: DSAQuestionAssignRequest) -> DSAQuestionAssignResponse:
    try:
        return service.assign_questions(request)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Question assignment failed: {exc}") from exc


@router.get("/questions/{question_id}")
async def get_question(question_id: int):
    question = service.get_question(question_id)
    if not question:
        raise HTTPException(status_code=404, detail="Question not found")
    return question


@router.get("/questions/{question_id}/test-cases")
async def get_test_cases(question_id: int, include_hidden: bool = Query(default=False)):
    return service.get_test_cases(question_id, include_hidden=include_hidden)
