"""FastAPI application entry point for code execution."""

from fastapi import FastAPI, HTTPException
import uvicorn
import logging
import os

from executor import execute_request
from models import ExecutionRequest, ExecutionResponse
import urllib.request
import json

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("execution-service")

app = FastAPI(title="Execution Service", version="1.0.0", description="Sandboxed code execution service")

GATEWAY_SERVICE_URL = os.getenv("GATEWAY_SERVICE_URL", "http://localhost:8080")


@app.get("/")
async def root():
    return {
        "service": "Execution Service",
        "version": "1.0.0",
        "status": "running",
        "health": "/health",
        "run": "/api/execute/run",
        "submit": "/api/execute/submit",
    }


@app.get("/health")
async def health():
    return {"status": "ok"}


@app.post("/api/execute/run", response_model=ExecutionResponse)
async def run_code(request: ExecutionRequest) -> ExecutionResponse:
    try:
        # Log incoming request details for debugging
        logger.info("Run request: questionId=%s, testCases=%d", getattr(request, "question_id", None), len(request.test_cases or []))
        return execute_request(request, include_hidden=False)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Execution failed: {exc}") from exc


@app.post("/api/execute/submit", response_model=ExecutionResponse)
async def submit_code(request: ExecutionRequest) -> ExecutionResponse:
    try:
        # If a questionId is provided, fetch canonical test cases (including hidden)
        question_id = getattr(request, "question_id", None)
        test_cases = request.test_cases or []
        if question_id is not None:
            try:
                # Fetch via gateway so service routing is consistent
                url = f"{GATEWAY_SERVICE_URL}/api/dsa/questions/{question_id}/test-cases?include_hidden=true"
                with urllib.request.urlopen(url) as resp:
                    raw = resp.read().decode()
                    parsed = json.loads(raw)
                    # FastAPI may return a list or an object with 'value'
                    if isinstance(parsed, dict) and 'value' in parsed:
                        parsed = parsed['value']

                    canonical = []
                    for item in parsed:
                        canonical.append(
                            {
                                'inputData': item.get('inputData') or item.get('input_data') or '',
                                'expectedOutput': item.get('expectedOutput') or item.get('expected_output') or '',
                                'hidden': bool(item.get('hidden', False)),
                            }
                        )
                    test_cases = canonical
            except Exception:
                logger.exception("Failed to fetch canonical test cases; falling back to client-supplied cases")

        total = len(test_cases or [])
        hidden = sum(
            1
            for tc in (test_cases or [])
            if (tc.get('hidden') if isinstance(tc, dict) else getattr(tc, 'hidden', False))
        )
        logger.info("Submit request: questionId=%s, totalTestCases=%d, hiddenTestCases=%d", question_id, total, hidden)

        # Rebuild ExecutionRequest with canonical test cases to ensure server-side enforcement
        request_obj = ExecutionRequest.parse_obj({
            'language': request.language,
            'code': request.code,
            'testCases': test_cases,
            'timeoutSeconds': request.timeout_seconds,
        })

        return execute_request(request_obj, include_hidden=True)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Submission failed: {exc}") from exc


if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8090, reload=True)
